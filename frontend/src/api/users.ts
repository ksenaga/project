import { request } from './client'

export type Member = {
  id: number
  name: string
}

export type User = Member & {
  role: number
}

// 一覧で返るユーザー(参画しているプロジェクト数付き)
export type UserSummary = User & {
  project_count: number
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

// 管理者は全ユーザー、それ以外は自分だけが返る(id 順)
export const fetchUsers = async () => (await request<{ users: UserSummary[] }>('/users')).users

export const fetchUser = (id: number) => request<UserDetail>(`/users/${id}`)

export const createUser = (input: UserInput) =>
  request<UserSummary>('/users', { method: 'POST', body: input })

export const updateUser = (id: number, input: UserInput) =>
  request<UserSummary>(`/users/${id}`, { method: 'PATCH', body: input })

export const deleteUser = (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' })
