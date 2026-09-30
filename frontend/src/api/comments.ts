import type { Member } from './users'
import { request } from './client'

export type Comment = {
  id: number
  // comment 以外は自動で記録されたもの(削除できない)。move:移動 / create:作成 / change:変更
  type: 'comment' | 'move' | 'create' | 'change'
  body: string
  user: Member // 書いた人(自動コメントは操作した人)
  created_at: string // ISO 8601
}

const base = (projectId: number, taskId: number) =>
  `/projects/${projectId}/tasks/${taskId}/comments`

// 古い順
export const fetchComments = (projectId: number, taskId: number) =>
  request<Comment[]>(base(projectId, taskId))

export const createComment = (projectId: number, taskId: number, body: string) =>
  request<Comment>(base(projectId, taskId), { method: 'POST', body: { body } })

export const deleteComment = (projectId: number, taskId: number, id: number) =>
  request<void>(`${base(projectId, taskId)}/${id}`, { method: 'DELETE' })
