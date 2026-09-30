import { db, type Conn } from '../db/knex'
import type { Member, ProjectBase, ProjectInput, ProjectPhase } from '../types/project'
import { TASK_STATUS, TASK_STATUSES } from '../types/task'
import { toMember } from './userRepository'

// 進捗度の分母に入れるステータス(対応中止は含まない)
const PROGRESS_STATUSES = TASK_STATUSES.filter((s) => s !== TASK_STATUS.CANCELED)

// プロジェクトの(削除されていない)タスクのうち、指定したステータスの数
const taskCount = (statuses: readonly string[]) =>
  db('tasks as t')
    .whereRaw('t.project_id = p.id')
    .whereNull('t.deleted_at')
    .whereIn('t.status', statuses)
    .count('*')

// deadline は "YYYY-MM-DD" の文字列で返す
const columns = [
  'p.id',
  'p.name',
  'p.detail',
  db.raw("DATE_FORMAT(p.deadline, '%Y-%m-%d') AS deadline"),
  'p.phase',
  taskCount([TASK_STATUS.DONE]).as('task_done'),
  taskCount(PROGRESS_STATUSES).as('task_total'),
]

type Row = Omit<ProjectBase, 'progress'> & {
  task_done: number | string
  task_total: number | string
}

const toProject = ({ task_done, task_total, ...rest }: Row): ProjectBase => ({
  ...rest,
  progress: { done: Number(task_done), total: Number(task_total) },
})

// 論理削除されていないプロジェクト
const activeProjects = (conn: Conn = db) => conn('projects as p').whereNull('p.deleted_at')

// 期限が近い順
export const findAll = async (): Promise<ProjectBase[]> => {
  const rows: Row[] = await activeProjects()
    .select(columns)
    .orderBy([{ column: 'p.deadline' }, { column: 'p.id' }])
  return rows.map(toProject)
}

export const findById = async (id: number, conn: Conn = db): Promise<ProjectBase | undefined> => {
  const row: Row | undefined = await activeProjects(conn).select(columns).where('p.id', id).first()
  return row && toProject(row)
}

// フェーズを変更する。更新した件数を返す(0 なら対象が存在しない)
export const updatePhase = async (
  id: number,
  phase: ProjectPhase,
  userId: number,
  conn: Conn = db,
): Promise<number> =>
  conn('projects')
    .where({ id })
    .whereNull('deleted_at')
    .update({ phase, updater: userId, updated_at: db.fn.now(3) })

export const findCreaterById = async (id: number): Promise<Member | undefined> => {
  const row: { id: number; name: string; avatar_updated_at: Date | null } | undefined =
    await activeProjects()
      .join('users as u', 'u.id', 'p.creater')
      .select('u.id', 'u.name', 'u.avatar_updated_at')
      .where('p.id', id)
      .first()
  return row && toMember(row)
}

export const create = async (
  input: ProjectInput,
  userId: number,
  conn: Conn = db,
): Promise<number> => {
  const [id] = await conn('projects').insert({ ...input, creater: userId })
  return id
}

// 更新した件数を返す(0 なら対象が存在しない)
export const update = async (
  id: number,
  input: Partial<ProjectInput>,
  userId: number,
  conn: Conn = db,
): Promise<number> =>
  conn('projects')
    .where({ id })
    .whereNull('deleted_at')
    .update({ ...input, updater: userId, updated_at: db.fn.now(3) })

// 論理削除。削除した件数を返す
export const softDelete = async (id: number, userId: number): Promise<number> =>
  db('projects')
    .where({ id })
    .whereNull('deleted_at')
    .update({ updater: userId, updated_at: db.fn.now(3), deleted_at: db.fn.now(3) })
