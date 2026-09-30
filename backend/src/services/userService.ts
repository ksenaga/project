import bcrypt from 'bcryptjs'
import { db } from '../db/knex'
import { badRequest, conflict, forbidden, notFound } from '../errors/HttpError'
import * as projectMemberRepository from '../repositories/projectMemberRepository'
import * as taskRepository from '../repositories/taskRepository'
import * as userRepository from '../repositories/userRepository'
import { INCOMPLETE_STATUSES } from '../types/task'
import {
  ROLE,
  type AuthUser,
  type AvatarContentType,
  type UserDetail,
  type UserInput,
  type UserSummary,
} from '../types/user'

const SALT_ROUNDS = 12

const userNotFound = () => notFound('ユーザーが存在しません')
const duplicateName = () => conflict('このユーザー名は既に使われています')

// name のユニーク制約違反(同時に同じ名前で登録された場合)
const isDuplicateEntry = (err: unknown) =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 'ER_DUP_ENTRY'

// ロックされているかは管理者にだけ返す(ロックを解除できるのは管理者だけなので)
const forViewer = (summary: UserSummary, viewer: AuthUser): UserSummary => {
  if (viewer.role === ROLE.ADMIN) return summary
  const { locked: _locked, ...rest } = summary
  return rest
}

const getSummary = async (id: number, viewer: AuthUser): Promise<UserSummary> => {
  const user = await userRepository.findActiveWithProjectCountById(id)
  if (!user) throw userNotFound()
  return forViewer(user, viewer)
}

// 一覧・詳細は全ロールが全ユーザーを見られる
export const list = async (user: AuthUser): Promise<UserSummary[]> =>
  (await userRepository.findAllActive()).map((summary) => forViewer(summary, user))

export const get = async (id: number): Promise<UserDetail> => {
  const target = await userRepository.findActiveById(id)
  if (!target) throw userNotFound()
  return { ...target, projects: await projectMemberRepository.findProjectsByUserId(id) }
}

// 作成は管理者のみ(ルートで制限)
export const create = async (input: UserInput, user: AuthUser): Promise<UserSummary> => {
  if (await userRepository.existsByName(input.name)) throw duplicateName()
  const password = await bcrypt.hash(input.password, SALT_ROUNDS)
  try {
    const id = await userRepository.create({ ...input, password }, user.id)
    return getSummary(id, user)
  } catch (err) {
    if (isDuplicateEntry(err)) throw duplicateName()
    throw err
  }
}

// 管理者は全ユーザー、それ以外は自分の名前・パスワードだけ変更できる
export const update = async (
  id: number,
  input: Partial<UserInput>,
  user: AuthUser,
): Promise<UserSummary> => {
  const isSelf = id === user.id
  if (user.role !== ROLE.ADMIN && !isSelf) throw forbidden()

  const target = await userRepository.findActiveById(id)
  if (!target) throw userNotFound()

  if (input.role !== undefined && input.role !== target.role) {
    if (user.role !== ROLE.ADMIN) throw forbidden()
    // 管理者がいなくならないよう、自分の権限は変更できない
    if (isSelf) throw badRequest('自分の権限は変更できません')
  }
  if (input.name !== undefined && (await userRepository.existsByName(input.name, id))) {
    throw duplicateName()
  }

  const { password, ...rest } = input
  const values =
    password === undefined ? rest : { ...rest, password: await bcrypt.hash(password, SALT_ROUNDS) }
  try {
    const count = await userRepository.update(id, values, user.id)
    if (count === 0) throw userNotFound()
  } catch (err) {
    if (isDuplicateEntry(err)) throw duplicateName()
    throw err
  }
  // 管理者がパスワードを設定し直したら、ロックも解除する(忘れてロックされた人を助けるため)
  if (password !== undefined && user.role === ROLE.ADMIN) {
    await userRepository.clearLoginFailures(id)
  }
  return getSummary(id, user)
}

// ロックの解除は管理者のみ(ルートで制限)
export const unlock = async (id: number, user: AuthUser): Promise<UserSummary> => {
  if (!(await userRepository.findActiveById(id))) throw userNotFound()
  await userRepository.clearLoginFailures(id)
  return getSummary(id, user)
}

// アイコン画像はログインしていれば誰でも見られる
export const getAvatar = async (id: number) => {
  const avatar = await userRepository.findAvatar(id)
  if (!avatar) throw notFound('アイコン画像が設定されていません')
  return avatar
}

// アイコン画像の設定・削除は、管理者は全員、それ以外は自分だけ
const ensureCanEditAvatar = async (id: number, user: AuthUser) => {
  if (user.role !== ROLE.ADMIN && id !== user.id) throw forbidden()
  if (!(await userRepository.findActiveById(id))) throw userNotFound()
}

export const saveAvatar = async (
  id: number,
  contentType: AvatarContentType,
  data: Buffer,
  user: AuthUser,
): Promise<UserSummary> => {
  await ensureCanEditAvatar(id, user)
  await userRepository.saveAvatar(id, contentType, data, user.id)
  return getSummary(id, user)
}

export const removeAvatar = async (id: number, user: AuthUser): Promise<UserSummary> => {
  await ensureCanEditAvatar(id, user)
  await userRepository.removeAvatar(id, user.id)
  return getSummary(id, user)
}

// 削除は管理者のみ(ルートで制限)。プロジェクトからも外す
export const remove = async (id: number, user: AuthUser): Promise<void> => {
  if (id === user.id) throw badRequest('自分自身は削除できません')
  if (!(await userRepository.findActiveById(id))) throw userNotFound()

  // 未完了のタスクを担当しているユーザーは、担当者を変更するまで削除できない
  if (await taskRepository.existsByAssigneeWithStatus(id, INCOMPLETE_STATUSES)) {
    throw conflict('未完了のタスクを担当しているため削除できません')
  }

  await db.transaction(async (trx) => {
    await projectMemberRepository.removeUserFromAll(id, trx)
    const count = await userRepository.softDelete(id, user.id, trx)
    if (count === 0) throw userNotFound()
  })
}
