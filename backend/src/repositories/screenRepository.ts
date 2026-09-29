import { db, type Conn } from '../db/knex'
import type { Screen, ScreenRef } from '../types/screen'

// 画面名を使っている(削除されていない)タスクの数
const taskCount = db('tasks as t')
  .whereRaw('t.screen_id = s.id')
  .whereNull('t.deleted_at')
  .count('*')

// 名前順
export const findByProject = async (projectId: number): Promise<Screen[]> => {
  const rows: (ScreenRef & { task_count: number | string })[] = await db('screens as s')
    .select('s.id', 's.name', taskCount.clone().as('task_count'))
    .where('s.project_id', projectId)
    .orderBy([{ column: 's.name' }, { column: 's.id' }])
  return rows.map((row) => ({ ...row, task_count: Number(row.task_count) }))
}

export const findById = async (projectId: number, id: number): Promise<Screen | undefined> => {
  const row: (ScreenRef & { task_count: number | string }) | undefined = await db('screens as s')
    .select('s.id', 's.name', taskCount.clone().as('task_count'))
    .where({ 's.project_id': projectId, 's.id': id })
    .first()
  return row && { ...row, task_count: Number(row.task_count) }
}

export const existsByName = async (
  projectId: number,
  name: string,
  excludeId?: number,
): Promise<boolean> => {
  const query = db('screens').where({ project_id: projectId, name })
  if (excludeId !== undefined) query.whereNot({ id: excludeId })
  return (await query.first('id')) !== undefined
}

export const create = async (projectId: number, name: string, userId: number): Promise<number> => {
  const [id] = await db('screens').insert({ project_id: projectId, name, creater: userId })
  return id
}

// 更新した件数を返す(0 なら対象が存在しない)
export const update = async (
  projectId: number,
  id: number,
  name: string,
  userId: number,
): Promise<number> =>
  db('screens')
    .where({ id, project_id: projectId })
    .update({ name, updater: userId, updated_at: db.fn.now(3) })

// 物理削除。削除した件数を返す
export const remove = async (projectId: number, id: number, conn: Conn = db): Promise<number> =>
  conn('screens').where({ id, project_id: projectId }).delete()
