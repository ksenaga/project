import { db, type Conn } from '../db/knex'
import type { Member, ProjectBase, ProjectInput } from '../types/project'

// deadline は "YYYY-MM-DD" の文字列で返す
const columns = [
  'p.id',
  'p.name',
  'p.detail',
  db.raw("DATE_FORMAT(p.deadline, '%Y-%m-%d') AS deadline"),
]

// 論理削除されていないプロジェクト
const activeProjects = (conn: Conn = db) => conn('projects as p').whereNull('p.deleted_at')

// 期限が近い順
export const findAll = async (): Promise<ProjectBase[]> =>
  activeProjects()
    .select(columns)
    .orderBy([{ column: 'p.deadline' }, { column: 'p.id' }])

export const findById = async (id: number, conn: Conn = db): Promise<ProjectBase | undefined> =>
  activeProjects(conn).select(columns).where('p.id', id).first()

export const findCreaterById = async (id: number): Promise<Member | undefined> =>
  activeProjects()
    .join('users as u', 'u.id', 'p.creater')
    .select('u.id', 'u.name')
    .where('p.id', id)
    .first()

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
