import { db, type Conn } from '../db/knex'
import type { Member } from '../types/project'
import {
  MAX_LOGIN_FAILURES,
  LOGIN_LOCK_MINUTES,
  ROLE,
  type AuthUser,
  type AvatarContentType,
  type UserProfile,
  type UserRow,
  type UserSummary,
} from '../types/user'

// DB へのアクセスだけを担当する。業務ルールは service に書く

// アイコン画像の URL。設定した日時を付けて、画像を変えたらブラウザのキャッシュを使わないようにする
export const avatarUrl = (id: number, avatarUpdatedAt: Date | string | null): string | null =>
  avatarUpdatedAt ? `/api/users/${id}/avatar?v=${new Date(avatarUpdatedAt).getTime()}` : null

// id・name・avatar_updated_at を持つ行を、API で返すユーザーの形にする
export const toMember = ({
  id,
  name,
  avatar_updated_at,
}: {
  id: number
  name: string
  avatar_updated_at: Date | string | null
}): Member => ({ id, name, avatar_url: avatarUrl(id, avatar_updated_at) })

// ログイン用。照合のためパスワード(ハッシュ)と、ロックが解けるまでの秒数(ロック中でなければ 0 以下か null)も取得する
export const findActiveByName = (
  name: string,
): Promise<
  | (Pick<UserRow, 'id' | 'name' | 'role' | 'password' | 'avatar_updated_at'> & {
      lock_seconds: number | null
    })
  | undefined
> =>
  db('users')
    .select(
      'id',
      'name',
      'role',
      'password',
      'avatar_updated_at',
      db.raw('TIMESTAMPDIFF(SECOND, NOW(3), locked_until) AS lock_seconds'),
    )
    .where({ name })
    .whereNull('deleted_at')
    .first()

// ログインに失敗した回数を1つ増やす。MAX_LOGIN_FAILURES 回に達したらロックして回数を0に戻す。
// 同時に失敗しても数え漏れがないよう、1つの UPDATE で行う(MySQL は SET を左から順に評価するので、
// locked_until を先に書いて、増やす前の回数で判定する)。ロックが解けるまでの秒数を返す(ロックしなければ null)
export const recordLoginFailure = async (id: number): Promise<number | null> => {
  await db('users')
    .where({ id })
    .update({
      locked_until: db.raw(
        `IF(failed_login_count + 1 >= ?, NOW(3) + INTERVAL ? MINUTE, locked_until)`,
        [MAX_LOGIN_FAILURES, LOGIN_LOCK_MINUTES],
      ),
      failed_login_count: db.raw(`IF(failed_login_count + 1 >= ?, 0, failed_login_count + 1)`, [
        MAX_LOGIN_FAILURES,
      ]),
    })
  const row: { lock_seconds: number | null } | undefined = await db('users')
    .select(db.raw('TIMESTAMPDIFF(SECOND, NOW(3), locked_until) AS lock_seconds'))
    .where({ id })
    .first()
  return row?.lock_seconds !== null && row?.lock_seconds !== undefined && row.lock_seconds > 0
    ? row.lock_seconds
    : null
}

// ログインに成功したとき・管理者がロックを解除したとき
export const clearLoginFailures = async (id: number): Promise<void> => {
  await db('users').where({ id }).update({ failed_login_count: 0, locked_until: null })
}

const toProfile = ({
  avatar_updated_at,
  ...row
}: AuthUser & Pick<UserRow, 'avatar_updated_at'>): UserProfile => ({
  ...row,
  avatar_url: avatarUrl(row.id, avatar_updated_at),
})

export const findActiveById = async (id: number): Promise<UserProfile | undefined> => {
  const row: (AuthUser & Pick<UserRow, 'avatar_updated_at'>) | undefined = await db<UserRow>(
    'users',
  )
    .select('id', 'name', 'role', 'avatar_updated_at')
    .where({ id })
    .whereNull('deleted_at')
    .first()
  return row && toProfile(row)
}

// 参画しているプロジェクト数(削除済みプロジェクトは数えない)
const projectCount = db('project_member as pm')
  .join('projects as p', 'p.id', 'pm.project_id')
  .whereRaw('pm.user_id = u.id')
  .whereNull('p.deleted_at')
  .count('*')

type SummaryRow = AuthUser &
  Pick<UserRow, 'avatar_updated_at'> & { project_count: number | string; locked: number }

const summaryColumns = () => [
  'u.id',
  'u.name',
  'u.role',
  'u.avatar_updated_at',
  projectCount.clone().as('project_count'),
  db.raw('COALESCE(u.locked_until > NOW(3), 0) AS locked'),
]

const toSummary = ({ project_count, locked, ...row }: SummaryRow): UserSummary => ({
  ...toProfile(row),
  project_count: Number(project_count),
  locked: Boolean(Number(locked)),
})

// id 順
export const findAllActive = async (): Promise<UserSummary[]> => {
  const rows: SummaryRow[] = await db('users as u')
    .select(summaryColumns())
    .whereNull('u.deleted_at')
    .orderBy('u.id')
  return rows.map(toSummary)
}

export const findActiveWithProjectCountById = async (
  id: number,
): Promise<UserSummary | undefined> => {
  const row: SummaryRow | undefined = await db('users as u')
    .select(summaryColumns())
    .where('u.id', id)
    .whereNull('u.deleted_at')
    .first()
  return row && toSummary(row)
}

// コメントでメンションできるユーザー(そのプロジェクトのメンバーと、全プロジェクトを見られる管理者)。名前順
export const findMentionable = async (projectId: number): Promise<Member[]> => {
  const rows: { id: number; name: string; avatar_updated_at: Date | null }[] = await db(
    'users as u',
  )
    .select('u.id', 'u.name', 'u.avatar_updated_at')
    .whereNull('u.deleted_at')
    .where((q) =>
      q
        .where('u.role', ROLE.ADMIN)
        .orWhereExists(
          db('project_member as pm')
            .whereRaw('pm.user_id = u.id')
            .where('pm.project_id', projectId),
        ),
    )
    .orderBy('u.name')
  return rows.map(toMember)
}

// アイコン画像のデータ
export const findAvatar = (
  userId: number,
): Promise<{ content_type: AvatarContentType; data: Buffer } | undefined> =>
  db('user_avatars as a')
    .join('users as u', 'u.id', 'a.user_id')
    .select('a.content_type', 'a.data')
    .where('a.user_id', userId)
    .whereNull('u.deleted_at')
    .first()

// アイコン画像を設定する(あれば置き換える)
export const saveAvatar = async (
  userId: number,
  contentType: AvatarContentType,
  data: Buffer,
  updaterId: number,
): Promise<void> => {
  await db.transaction(async (trx) => {
    await trx('user_avatars')
      .insert({ user_id: userId, content_type: contentType, data })
      .onConflict('user_id')
      .merge({ content_type: contentType, data, created_at: db.fn.now(3) })
    await trx('users')
      .where({ id: userId })
      .update({ avatar_updated_at: db.fn.now(3), updater: updaterId, updated_at: db.fn.now(3) })
  })
}

// アイコン画像を削除する(名前の頭文字の表示に戻る)
export const removeAvatar = async (userId: number, updaterId: number): Promise<void> => {
  await db.transaction(async (trx) => {
    await trx('user_avatars').where({ user_id: userId }).delete()
    await trx('users')
      .where({ id: userId })
      .update({ avatar_updated_at: null, updater: updaterId, updated_at: db.fn.now(3) })
  })
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

// 指定した権限の(削除されていない)ユーザーの ID
export const findActiveIdsByRole = async (role: number): Promise<number[]> => {
  const rows: { id: number }[] = await db('users')
    .select('id')
    .where({ role })
    .whereNull('deleted_at')
  return rows.map((row) => row.id)
}
