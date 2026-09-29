import { db, type Conn } from '../db/knex'
import type { Task, TaskFilter, TaskInput, TaskStatus, TaskSummary } from '../types/task'

const summaryColumns = [
  't.id',
  't.title',
  't.status',
  db.raw("DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline"),
  'u.id as assignee_id',
  'u.name as assignee_name',
  's.id as screen_id',
  's.name as screen_name',
]

const detailColumns = [...summaryColumns, 't.detail', 't.modified', 't.reason', 't.git', 't.memo']

type Row = Omit<TaskSummary, 'assignee' | 'screen'> & {
  assignee_id: number
  assignee_name: string
  screen_id: number | null
  screen_name: string | null
}

const toTask = <T extends Row>({
  assignee_id,
  assignee_name,
  screen_id,
  screen_name,
  ...rest
}: T) => ({
  ...rest,
  assignee: { id: assignee_id, name: assignee_name },
  screen: screen_id === null ? null : { id: screen_id, name: screen_name! },
})

// 対象プロジェクトの、論理削除されていないタスク(担当者・画面名を結合)
const activeTasks = (projectId: number, conn: Conn = db) =>
  conn('tasks as t')
    .join('users as u', 'u.id', 't.user_id')
    .leftJoin('screens as s', 's.id', 't.screen_id')
    .where('t.project_id', projectId)
    .whereNull('t.deleted_at')

// LIKE で使う % _ \ を文字として扱う
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

// 期限が近い順。filter の条件はすべて満たすもの(AND)
export const findByProject = async (
  projectId: number,
  filter: TaskFilter = {},
): Promise<TaskSummary[]> => {
  const query = activeTasks(projectId)
    .select(summaryColumns)
    .orderBy([{ column: 't.deadline' }, { column: 't.id' }])

  if (filter.q) {
    const pattern = `%${escapeLike(filter.q)}%`
    query.where((w) => {
      for (const column of ['t.title', 't.detail', 't.modified', 't.reason', 't.memo']) {
        w.orWhere(column, 'like', pattern)
      }
    })
  }
  if (filter.assigneeId !== undefined) query.where('t.user_id', filter.assigneeId)
  if (filter.screenId === null) query.whereNull('t.screen_id')
  else if (filter.screenId !== undefined) query.where('t.screen_id', filter.screenId)

  const rows: Row[] = await query
  return rows.map(toTask)
}

export const findById = async (projectId: number, id: number): Promise<Task | undefined> => {
  const row: (Row & Omit<Task, keyof TaskSummary>) | undefined = await activeTasks(projectId)
    .select(detailColumns)
    .where('t.id', id)
    .first()
  return row && toTask(row)
}

export const create = async (
  projectId: number,
  input: TaskInput,
  userId: number,
): Promise<number> => {
  const [id] = await db('tasks').insert({ ...input, project_id: projectId, creater: userId })
  return id
}

// 更新した件数を返す(0 なら対象が存在しない)
export const update = async (
  projectId: number,
  id: number,
  input: Partial<TaskInput>,
  userId: number,
): Promise<number> =>
  db('tasks')
    .where({ id, project_id: projectId })
    .whereNull('deleted_at')
    .update({ ...input, updater: userId, updated_at: db.fn.now(3) })

// 論理削除。削除した件数を返す
export const softDelete = async (projectId: number, id: number, userId: number): Promise<number> =>
  db('tasks')
    .where({ id, project_id: projectId })
    .whereNull('deleted_at')
    .update({ updater: userId, updated_at: db.fn.now(3), deleted_at: db.fn.now(3) })

// 指定したユーザーのうち、指定したステータスのタスクを担当しているユーザーの ID
export const findAssigneeIdsWithStatus = async (
  projectId: number,
  userIds: number[],
  statuses: readonly TaskStatus[],
  conn: Conn = db,
): Promise<number[]> => {
  if (userIds.length === 0) return []
  const rows: { user_id: number }[] = await conn('tasks')
    .distinct('user_id')
    .where({ project_id: projectId })
    .whereIn('user_id', userIds)
    .whereIn('status', statuses)
    .whereNull('deleted_at')
  return rows.map((row) => row.user_id)
}

// 指定したステータスのタスクを担当しているか(削除済みのタスク・プロジェクトは除く)
export const existsByAssigneeWithStatus = async (
  userId: number,
  statuses: readonly TaskStatus[],
  conn: Conn = db,
): Promise<boolean> => {
  const row = await conn('tasks as t')
    .join('projects as p', 'p.id', 't.project_id')
    .where('t.user_id', userId)
    .whereIn('t.status', statuses)
    .whereNull('t.deleted_at')
    .whereNull('p.deleted_at')
    .first('t.id')
  return row !== undefined
}

// 削除済みのタスクから画面名を外す(画面名を削除する前に使う)
export const clearScreenOfDeletedTasks = async (screenId: number, conn: Conn = db) => {
  await conn('tasks')
    .where({ screen_id: screenId })
    .whereNotNull('deleted_at')
    .update({ screen_id: null })
}
