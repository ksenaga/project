import { db } from '../db/knex'
import { conflict, notFound } from '../errors/HttpError'
import * as screenRepository from '../repositories/screenRepository'
import * as taskRepository from '../repositories/taskRepository'
import type { Screen } from '../types/screen'
import type { AuthUser } from '../types/user'
import { ensureProjectAccess } from './projectAccess'

// 画面名の追加・編集・削除はプロジェクトメンバー全員(管理者は全プロジェクト)ができる

const screenNotFound = () => notFound('画面名が存在しません')
const duplicateName = () => conflict('この画面名は既に登録されています')

const isDuplicateEntry = (err: unknown) =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 'ER_DUP_ENTRY'

const getScreen = async (projectId: number, id: number): Promise<Screen> => {
  const screen = await screenRepository.findById(projectId, id)
  if (!screen) throw screenNotFound()
  return screen
}

export const list = async (projectId: number, user: AuthUser): Promise<Screen[]> => {
  await ensureProjectAccess(projectId, user)
  return screenRepository.findByProject(projectId)
}

export const create = async (projectId: number, name: string, user: AuthUser): Promise<Screen> => {
  await ensureProjectAccess(projectId, user)
  if (await screenRepository.existsByName(projectId, name)) throw duplicateName()
  try {
    const id = await screenRepository.create(projectId, name, user.id)
    return await getScreen(projectId, id)
  } catch (err) {
    if (isDuplicateEntry(err)) throw duplicateName()
    throw err
  }
}

export const update = async (
  projectId: number,
  id: number,
  name: string,
  user: AuthUser,
): Promise<Screen> => {
  await ensureProjectAccess(projectId, user)
  if (await screenRepository.existsByName(projectId, name, id)) throw duplicateName()
  try {
    const count = await screenRepository.update(projectId, id, name, user.id)
    if (count === 0) throw screenNotFound()
  } catch (err) {
    if (isDuplicateEntry(err)) throw duplicateName()
    throw err
  }
  return getScreen(projectId, id)
}

// タスクで使われている画面名は削除できない
export const remove = async (projectId: number, id: number, user: AuthUser): Promise<void> => {
  await ensureProjectAccess(projectId, user)
  const screen = await getScreen(projectId, id)
  if (screen.task_count > 0) throw conflict('タスクで使われている画面名は削除できません')

  await db.transaction(async (trx) => {
    await taskRepository.clearScreenOfDeletedTasks(id, trx)
    const count = await screenRepository.remove(projectId, id, trx)
    if (count === 0) throw screenNotFound()
  })
}

// タスクに設定する画面名が、そのプロジェクトのものか
export const exists = async (projectId: number, id: number): Promise<boolean> =>
  (await screenRepository.findById(projectId, id)) !== undefined
