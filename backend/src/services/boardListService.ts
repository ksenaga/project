import { db } from '../db/knex'
import { badRequest, conflict, notFound } from '../errors/HttpError'
import * as boardListRepository from '../repositories/boardListRepository'
import * as taskRepository from '../repositories/taskRepository'
import { DEFAULT_LIST_COLOR, type BoardList } from '../types/boardList'
import type { AuthUser } from '../types/user'
import { ensureProjectAccess } from './projectAccess'
import { ensureCanEdit } from './projectService'

// 閲覧はプロジェクトメンバー(管理者は全プロジェクト)。
// 追加・名前や色の変更・並べ替え・削除は、管理者と担当しているリーダーのみ(プロジェクトの編集と同じ)

const listNotFound = () => notFound('リストが存在しません')
const duplicateName = () => conflict('同じ名前のリストが既にあります')
const fixedList = () =>
  badRequest('未対応・対応中・レビュー中・完了・対応中止のリストは変更・削除できません')

const isDuplicateEntry = (err: unknown) =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 'ER_DUP_ENTRY'

const getList = async (projectId: number, id: number): Promise<BoardList> => {
  const list = await boardListRepository.findById(projectId, id)
  if (!list) throw listNotFound()
  return list
}

export const list = async (projectId: number, user: AuthUser): Promise<BoardList[]> => {
  await ensureProjectAccess(projectId, user)
  return boardListRepository.findByProject(projectId)
}

// 色を指定しなければ DEFAULT_LIST_COLOR(同じ色のリストがあってもよい)
export const create = async (
  projectId: number,
  { name, color = DEFAULT_LIST_COLOR }: { name: string; color?: string },
  user: AuthUser,
): Promise<BoardList> => {
  await ensureCanEdit(projectId, user)
  if (await boardListRepository.existsByName(projectId, name)) throw duplicateName()
  try {
    const id = await boardListRepository.create(projectId, name, color, user.id)
    return await getList(projectId, id)
  } catch (err) {
    if (isDuplicateEntry(err)) throw duplicateName()
    throw err
  }
}

// 名前・色の変更(追加したリストのみ)
export const update = async (
  projectId: number,
  id: number,
  fields: { name?: string; color?: string },
  user: AuthUser,
): Promise<BoardList> => {
  await ensureCanEdit(projectId, user)
  const current = await getList(projectId, id)
  if (current.status !== null) throw fixedList()
  if (
    fields.name !== undefined &&
    (await boardListRepository.existsByName(projectId, fields.name, id))
  ) {
    throw duplicateName()
  }
  try {
    await boardListRepository.update(projectId, id, fields, user.id)
  } catch (err) {
    if (isDuplicateEntry(err)) throw duplicateName()
    throw err
  }
  return getList(projectId, id)
}

// ids はプロジェクトの全リストを、左から並べたい順に並べたもの
export const reorder = async (
  projectId: number,
  ids: number[],
  user: AuthUser,
): Promise<BoardList[]> => {
  await ensureCanEdit(projectId, user)
  const current = (await boardListRepository.findByProject(projectId)).map((l) => l.id)
  if (ids.length !== current.length || current.some((id) => !ids.includes(id))) {
    throw badRequest('すべてのリストを指定してください')
  }
  await db.transaction((trx) => boardListRepository.reorder(projectId, ids, user.id, trx))
  return boardListRepository.findByProject(projectId)
}

// タスクが入っているリストは削除できない
export const remove = async (projectId: number, id: number, user: AuthUser): Promise<void> => {
  await ensureCanEdit(projectId, user)
  const current = await getList(projectId, id)
  if (current.status !== null) throw fixedList()
  if (current.task_count > 0) throw conflict('タスクが入っているリストは削除できません')

  await db.transaction(async (trx) => {
    await taskRepository.clearListOfDeletedTasks(id, trx)
    const count = await boardListRepository.remove(projectId, id, trx)
    if (count === 0) throw listNotFound()
  })
}

// タスクを移動するリストが、そのプロジェクトの追加したリストか
export const findCustomList = async (projectId: number, id: number) => {
  const list = await boardListRepository.findById(projectId, id)
  return list && list.status === null ? list : undefined
}
