import { request } from './client'

export type Member = {
  id: number
  name: string
}

export type User = Member & {
  role: number
}

// 管理者は全ユーザー、それ以外は自分だけが返る
export const fetchUsers = async () => (await request<{ users: User[] }>('/users')).users
