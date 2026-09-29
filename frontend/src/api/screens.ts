import { request } from './client'

export type ScreenRef = {
  id: number
  name: string
}

// task_count は画面名を使っているタスク数(1 以上なら削除できない)
export type Screen = ScreenRef & {
  task_count: number
}

const base = (projectId: number) => `/projects/${projectId}/screens`

// 名前順
export const fetchScreens = (projectId: number) => request<Screen[]>(base(projectId))

export const createScreen = (projectId: number, name: string) =>
  request<Screen>(base(projectId), { method: 'POST', body: { name } })

export const updateScreen = (projectId: number, id: number, name: string) =>
  request<Screen>(`${base(projectId)}/${id}`, { method: 'PATCH', body: { name } })

export const deleteScreen = (projectId: number, id: number) =>
  request<void>(`${base(projectId)}/${id}`, { method: 'DELETE' })
