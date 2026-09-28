import { db } from '../db/knex'
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
