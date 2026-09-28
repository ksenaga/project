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
}

// ログイン中のユーザー(パスワードは含めない)
export type AuthUser = Pick<UserRow, 'id' | 'name' | 'role'>
