import { db, type Conn } from '../db/knex'
import type { AuthUser, UserRow, UserSummary } from '../types/user'

// DB へのアクセスだけを担当する。業務ルールは service に書く

// ログイン用。照合のためパスワード(ハッシュ)も取得する
export const findActiveByName = (
  name: string,
): Promise<Pick<UserRow, 'id' | 'name' | 'role' | 'password'> | undefined> =>
  db<UserRow>('users')
    .select('id', 'name', 'role', 'password')
    .where({ name })
    .whereNull('deleted_at')
    .first()

export const findActiveById = (id: number): Promise<AuthUser | undefined> =>
  db<UserRow>('users').select('id', 'name', 'role').where({ id }).whereNull('deleted_at').first()

// 参画しているプロジェクト数(削除済みプロジェクトは数えない)
const projectCount = db('project_member as pm')
  .join('projects as p', 'p.id', 'pm.project_id')
  .whereRaw('pm.user_id = u.id')
  .whereNull('p.deleted_at')
  .count('*')

// id 順
export const findAllActive = async (): Promise<UserSummary[]> => {
  const rows: (AuthUser & { project_count: number | string })[] = await db('users as u')
    .select('u.id', 'u.name', 'u.role', projectCount.clone().as('project_count'))
    .whereNull('u.deleted_at')
    .orderBy('u.id')
  return rows.map((row) => ({ ...row, project_count: Number(row.project_count) }))
}

export const findActiveWithProjectCountById = async (
  id: number,
): Promise<UserSummary | undefined> => {
  const row: (AuthUser & { project_count: number | string }) | undefined = await db('users as u')
    .select('u.id', 'u.name', 'u.role', projectCount.clone().as('project_count'))
    .where('u.id', id)
    .whereNull('u.deleted_at')
    .first()
  return row && { ...row, project_count: Number(row.project_count) }
}

// 指定した ID のうち、存在する(削除されていない)ユーザーの数
export const countActiveByIds = async (ids: number[], conn: Conn = db): Promise<number> => {
  if (ids.length === 0) return 0
  const row = await conn('users')
    .whereIn('id', ids)
    .whereNull('deleted_at')
    .count({ count: '*' })
    .first()
  return Number(row?.count ?? 0)
}

// 名前が使われているか。name は削除済みユーザーも含めてユニークなので、削除済みも対象にする
export const existsByName = async (name: string, excludeId?: number): Promise<boolean> => {
  const query = db('users').where({ name })
  if (excludeId !== undefined) query.whereNot({ id: excludeId })
  return (await query.first('id')) !== undefined
}

export const create = async (
  input: Pick<UserRow, 'name' | 'password' | 'role'>,
  createrId: number,
): Promise<number> => {
  const [id] = await db('users').insert({ ...input, creater: createrId })
  return id
}

// 更新した件数を返す(0 なら対象が存在しない)
export const update = async (
  id: number,
  input: Partial<Pick<UserRow, 'name' | 'password' | 'role'>>,
  updaterId: number,
): Promise<number> =>
  db('users')
    .where({ id })
    .whereNull('deleted_at')
    .update({ ...input, updater: updaterId, updated_at: db.fn.now(3) })

// 論理削除。削除した件数を返す
export const softDelete = async (id: number, updaterId: number, conn: Conn = db): Promise<number> =>
  conn('users')
    .where({ id })
    .whereNull('deleted_at')
    .update({ updater: updaterId, updated_at: db.fn.now(3), deleted_at: db.fn.now(3) })
