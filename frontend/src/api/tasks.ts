import type { TaskStatus } from '../constants/taskStatus'
import { request } from './client'
import type { Member } from './users'

// 一覧で返るタスク
export type TaskSummary = {
  id: number
  title: string
  status: TaskStatus
  deadline: string // "YYYY-MM-DD"
  assignee: Member
}

// 詳細で返るタスク
export type Task = TaskSummary & {
  detail: string
  screen: string | null
  modified: string | null
  reason: string | null
  git: string | null
  memo: string | null
}

export type TaskInput = {
  title: string
  detail: string
  user_id: number
  status: TaskStatus
  deadline: string
  screen: string | null
  modified: string | null
  reason: string | null
  git: string | null
  memo: string | null
}

const base = (projectId: number) => `/projects/${projectId}/tasks`

export const fetchTasks = (projectId: number) => request<TaskSummary[]>(base(projectId))

export const fetchTask = (projectId: number, id: number) =>
  request<Task>(`${base(projectId)}/${id}`)

export const createTask = (projectId: number, input: TaskInput) =>
  request<Task>(base(projectId), { method: 'POST', body: input })

// 送った項目だけ更新される
export const updateTask = (projectId: number, id: number, input: Partial<TaskInput>) =>
  request<Task>(`${base(projectId)}/${id}`, { method: 'PATCH', body: input })

export const deleteTask = (projectId: number, id: number) =>
  request<void>(`${base(projectId)}/${id}`, { method: 'DELETE' })
