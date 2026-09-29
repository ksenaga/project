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

export const ROLES: readonly Role[] = Object.values(ROLE)

// 一覧で返すユーザー(参画しているプロジェクト数付き)
export type UserSummary = AuthUser & {
  project_count: number
}

// 詳細で返すユーザー(参画しているプロジェクト付き)
export type UserDetail = AuthUser & {
  projects: { id: number; name: string }[]
}

// 作成・編集で受け取る値(password は平文。保存前にハッシュ化する)
export type UserInput = {
  name: string
  password: string
  role: Role
}
