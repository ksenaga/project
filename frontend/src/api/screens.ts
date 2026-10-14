import { request } from './client'

export type ScreenRef = {
  id: number
  name: string
  color: string // 画面名の色(#RRGGBB。明るい色)
}

// task_count は画面名を使っているタスク数(1 以上なら削除できない)
export type Screen = ScreenRef & {
  task_count: number
}

const base = (projectId: number) => `/projects/${projectId}/screens`

// 名前順
export const fetchScreens = (projectId: number) => request<Screen[]>(base(projectId))

export const createScreen = (projectId: number, input: { name: string; color: string }) =>
  request<Screen>(base(projectId), { method: 'POST', body: input })

// 送った項目だけ変更する
export const updateScreen = (
  projectId: number,
  id: number,
  input: { name?: string; color?: string },
) => request<Screen>(`${base(projectId)}/${id}`, { method: 'PATCH', body: input })

export const deleteScreen = (projectId: number, id: number) =>
  request<void>(`${base(projectId)}/${id}`, { method: 'DELETE' })
