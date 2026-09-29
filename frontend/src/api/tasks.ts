import type { DeadlineColor } from '../constants/deadlineColor'
import type { TaskStatus } from '../constants/taskStatus'
import { request } from './client'
import type { ScreenRef } from './screens'
import type { Member } from './users'

// 一覧で返るタスク
export type TaskSummary = {
  id: number
  title: string
  status: TaskStatus
  deadline: string // "YYYY-MM-DD"
  assignee: Member
  screen: ScreenRef | null
}

// 詳細で返るタスク
export type Task = TaskSummary & {
  detail: string
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
  screen_id: number // 必須
  modified: string | null
  reason: string | null
  git: string | null
  memo: string | null
}

const base = (projectId: number) => `/projects/${projectId}/tasks`

// 一覧の絞り込み条件。指定したものすべてに当てはまるタスクが返る
export type TaskFilter = {
  q: string // タイトル・説明・修正内容・修正理由・メモに含まれる文字
  assigneeId: number | '' // '' はすべて
  screenId: number | '' // '' はすべて
  deadlineFrom: string // "YYYY-MM-DD"。'' は指定なし
  deadlineTo: string
  deadlineColor: DeadlineColor | '' // 完了・対応中止のタスクは含まない。'' はすべて
}

export const EMPTY_TASK_FILTER: TaskFilter = {
  q: '',
  assigneeId: '',
  screenId: '',
  deadlineFrom: '',
  deadlineTo: '',
  deadlineColor: '',
}

// 条件が1つでも指定されているか
export const isFiltering = (filter: TaskFilter) =>
  filter.q.trim() !== '' ||
  filter.assigneeId !== '' ||
  filter.screenId !== '' ||
  filter.deadlineFrom !== '' ||
  filter.deadlineTo !== '' ||
  filter.deadlineColor !== ''

export const fetchTasks = (projectId: number, filter: TaskFilter = EMPTY_TASK_FILTER) => {
  const params = new URLSearchParams()
  if (filter.q.trim() !== '') params.set('q', filter.q.trim())
  if (filter.assigneeId !== '') params.set('assignee_id', String(filter.assigneeId))
  if (filter.screenId !== '') params.set('screen_id', String(filter.screenId))
  if (filter.deadlineFrom !== '') params.set('deadline_from', filter.deadlineFrom)
  if (filter.deadlineTo !== '') params.set('deadline_to', filter.deadlineTo)
  if (filter.deadlineColor !== '') params.set('deadline_color', filter.deadlineColor)
  const query = params.toString()
  return request<TaskSummary[]>(query ? `${base(projectId)}?${query}` : base(projectId))
}

export const fetchTask = (projectId: number, id: number) =>
  request<Task>(`${base(projectId)}/${id}`)

export const createTask = (projectId: number, input: TaskInput) =>
  request<Task>(base(projectId), { method: 'POST', body: input })

// 送った項目だけ更新される
export const updateTask = (projectId: number, id: number, input: Partial<TaskInput>) =>
  request<Task>(`${base(projectId)}/${id}`, { method: 'PATCH', body: input })

export const deleteTask = (projectId: number, id: number) =>
  request<void>(`${base(projectId)}/${id}`, { method: 'DELETE' })
