import { db, type Conn } from '../db/knex'
import { FIXED_LIST_COLORS, type BoardList } from '../types/boardList'
import { TASK_STATUSES } from '../types/task'

// リストに入っているタスク数。既存の5つは「追加したリストに入っていない、そのステータスのタスク」
const taskCount = db('tasks as t')
  .whereRaw('t.project_id = l.project_id')
  .whereNull('t.deleted_at')
  .whereRaw(
    '(t.list_id = l.id OR (l.status IS NOT NULL AND t.list_id IS NULL AND t.status = l.status))',
  )
  .count('*')

type Row = Omit<BoardList, 'task_count'> & { task_count: number | string }

const toList = (row: Row): BoardList => ({ ...row, task_count: Number(row.task_count) })

const columns = [
  'l.id',
  'l.name',
  'l.status',
  'l.position',
  'l.color',
  taskCount.clone().as('task_count'),
]

// 並び順
export const findByProject = async (projectId: number, conn: Conn = db): Promise<BoardList[]> => {
  const rows: Row[] = await conn('board_lists as l')
    .select(columns)
    .where('l.project_id', projectId)
    .orderBy([{ column: 'l.position' }, { column: 'l.id' }])
  return rows.map(toList)
}

export const findById = async (projectId: number, id: number): Promise<BoardList | undefined> => {
  const row: Row | undefined = await db('board_lists as l')
    .select(columns)
    .where({ 'l.project_id': projectId, 'l.id': id })
    .first()
  return row && toList(row)
}

// 既存の5つのリストを作る(プロジェクト作成時)
export const createDefaults = async (projectId: number, userId: number, conn: Conn = db) => {
  await conn('board_lists').insert(
    TASK_STATUSES.map((status, i) => ({
      project_id: projectId,
      name: status,
      status,
      position: i + 1,
      color: FIXED_LIST_COLORS[status],
      creater: userId,
    })),
  )
}

export const existsByName = async (
  projectId: number,
  name: string,
  excludeId?: number,
): Promise<boolean> => {
  const query = db('board_lists').where({ project_id: projectId, name })
  if (excludeId !== undefined) query.whereNot({ id: excludeId })
  return (await query.first('id')) !== undefined
}

// 一番右に追加する
export const create = async (
  projectId: number,
  name: string,
  color: string,
  userId: number,
): Promise<number> => {
  const row = await db('board_lists')
    .where({ project_id: projectId })
    .max({ max: 'position' })
    .first()
  const [id] = await db('board_lists').insert({
    project_id: projectId,
    name,
    status: null,
    position: Number(row?.max ?? 0) + 1,
    color,
    creater: userId,
  })
  return id
}

// 名前・色を変更する
export const update = async (
  projectId: number,
  id: number,
  fields: { name?: string; color?: string },
  userId: number,
) =>
  db('board_lists')
    .where({ id, project_id: projectId })
    .update({ ...fields, updater: userId, updated_at: db.fn.now(3) })

// 指定した順番(左から)に並べ直す
export const reorder = async (projectId: number, ids: number[], userId: number, conn: Conn) => {
  for (const [i, id] of ids.entries()) {
    await conn('board_lists')
      .where({ id, project_id: projectId })
      .update({ position: i + 1, updater: userId, updated_at: db.fn.now(3) })
  }
}

// 物理削除。削除した件数を返す
export const remove = async (projectId: number, id: number, conn: Conn = db): Promise<number> =>
  conn('board_lists').where({ id, project_id: projectId }).delete()
