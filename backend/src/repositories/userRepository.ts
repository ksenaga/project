import { db, type Conn } from '../db/knex'
import type { AuthUser, UserRow } from '../types/user'

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

export const findAllActive = (): Promise<AuthUser[]> =>
  db<UserRow>('users').select('id', 'name', 'role').whereNull('deleted_at').orderBy('id')

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
