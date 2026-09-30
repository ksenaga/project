import { request } from './client'

export type Member = {
  id: number
  name: string
  // アイコン画像の URL(画像がなければ null。画面で作った値にはない)
  avatar_url?: string | null
}

export type User = Member & {
  role: number
}

// 一覧で返るユーザー(参画しているプロジェクト数付き)
// locked はログインに続けて失敗してロックされているか(管理者にだけ返る)
export type UserSummary = User & {
  project_count: number
  locked?: boolean
}

// 詳細で返るユーザー(参画しているプロジェクト付き)
export type UserDetail = User & {
  projects: Member[]
}

// password は編集時に空なら変更しない
export type UserInput = {
  name: string
  password?: string
  role?: number
}

// 全ユーザー(id 順)
export const fetchUsers = async () => (await request<{ users: UserSummary[] }>('/users')).users

export const fetchUser = (id: number) => request<UserDetail>(`/users/${id}`)

export const createUser = (input: UserInput) =>
  request<UserSummary>('/users', { method: 'POST', body: input })

export const updateUser = (id: number, input: UserInput) =>
  request<UserSummary>(`/users/${id}`, { method: 'PATCH', body: input })

export const deleteUser = (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' })

// ロックを解除する(管理者のみ)
export const unlockUser = (id: number) =>
  request<UserSummary>(`/users/${id}/unlock`, { method: 'POST' })

// アイコン画像(PNG・JPEG・WebP。1MB まで)を設定する。管理者は全員、それ以外は自分だけ
export const uploadAvatar = (id: number, image: Blob) =>
  request<UserSummary>(`/users/${id}/avatar`, { method: 'PUT', body: image })

export const deleteAvatar = (id: number) =>
  request<UserSummary>(`/users/${id}/avatar`, { method: 'DELETE' })
