import { db, type Conn } from '../db/knex'
import type { Task, TaskInput, TaskStatus, TaskSummary } from '../types/task'

const summaryColumns = [
  't.id',
  't.title',
  't.status',
  db.raw("DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline"),
  'u.id as assignee_id',
  'u.name as assignee_name',
]

const detailColumns = [
  ...summaryColumns,
  't.detail',
  't.screen',
  't.modified',
  't.reason',
  't.git',
  't.memo',
]

type Row = Omit<TaskSummary, 'assignee'> & { assignee_id: number; assignee_name: string }

const toTask = <T extends Row>({ assignee_id, assignee_name, ...rest }: T) => ({
  ...rest,
  assignee: { id: assignee_id, name: assignee_name },
})

// 対象プロジェクトの、論理削除されていないタスク(担当者を結合)
const activeTasks = (projectId: number, conn: Conn = db) =>
  conn('tasks as t')
    .join('users as u', 'u.id', 't.user_id')
    .where('t.project_id', projectId)
    .whereNull('t.deleted_at')

// 期限が近い順
export const findByProject = async (projectId: number): Promise<TaskSummary[]> => {
  const rows: Row[] = await activeTasks(projectId)
    .select(summaryColumns)
    .orderBy([{ column: 't.deadline' }, { column: 't.id' }])
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
