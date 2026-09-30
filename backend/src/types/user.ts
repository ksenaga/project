export const ROLE = {
  ADMIN: 1, // 管理者
  LEADER: 2, // リーダー
  MEMBER: 3, // 一般ユーザー
} as const

export type Role = (typeof ROLE)[keyof typeof ROLE]

// users テーブルの行
export type UserRow = {
  id: number
  name: string
  password: string
  role: Role
  creater: number
  created_at: Date
  updater: number | null
  updated_at: Date | null
  deleted_at: Date | null
  failed_login_count: number // ログインに続けて失敗した回数
  locked_until: Date | null // この日時までログインできない
  avatar_updated_at: Date | null // アイコン画像を設定した日時(NULL なら画像なし)
}

// ログイン中のユーザー(パスワードは含めない)
export type AuthUser = Pick<UserRow, 'id' | 'name' | 'role'>

export const ROLES: readonly Role[] = Object.values(ROLE)

// API で返すユーザー(アイコン画像の URL 付き)
export type UserProfile = AuthUser & {
  avatar_url: string | null
}

// 一覧で返すユーザー(参画しているプロジェクト数付き)。
// locked はログインに続けて失敗してロックされているか(管理者にだけ返す)
export type UserSummary = UserProfile & {
  project_count: number
  locked?: boolean
}

// 詳細で返すユーザー(参画しているプロジェクト付き)
export type UserDetail = UserProfile & {
  projects: { id: number; name: string }[]
}

// ログインに続けて失敗できる回数と、ロックする時間(分)
export const MAX_LOGIN_FAILURES = 5
export const LOGIN_LOCK_MINUTES = 15

// アイコン画像として受け付ける形式と、大きさの上限(画面で 256px 四方に縮めてから送る)
export const AVATAR_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export type AvatarContentType = (typeof AVATAR_CONTENT_TYPES)[number]
export const AVATAR_MAX_BYTES = 1024 * 1024

// 作成・編集で受け取る値(password は平文。保存前にハッシュ化する)
export type UserInput = {
  name: string
  password: string
  role: Role
}
