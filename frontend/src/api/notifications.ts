import { request } from './client'

export type Notification = {
  id: number
  type: 'project_member' | 'task_assignee' | 'task_review' | 'task_cancel_request' | 'task_comment'
  project_id: number
  task_id: number | null // プロジェクトの通知は null
  message: string
  read: boolean
  created_at: string // ISO 8601
}

// 自分の通知(新しい順に30件)と未読の件数
export const fetchNotifications = () =>
  request<{ notifications: Notification[]; unread_count: number }>('/notifications')

export const markNotificationRead = (id: number) =>
  request<void>(`/notifications/${id}/read`, { method: 'POST' })

export const markAllNotificationsRead = () =>
  request<void>('/notifications/read-all', { method: 'POST' })
