import type { TaskStatus } from '../constants/taskStatus'
import { request } from './client'

// ボードのリスト。status があるのは既存の5つ(名前の変更・削除はできない)、null は追加したリスト
export type BoardList = {
  id: number
  name: string
  status: TaskStatus | null
  position: number
  color: string // 背景色(#RRGGBB)
  task_count: number // 入っているタスク数(絞り込みに関係なく全件)
}

const base = (projectId: number) => `/projects/${projectId}/lists`

// 並び順(左から)
export const fetchBoardLists = (projectId: number) => request<BoardList[]>(base(projectId))

export const createBoardList = (projectId: number, name: string, color: string) =>
  request<BoardList>(base(projectId), { method: 'POST', body: { name, color } })

// 名前・色の変更(送った項目だけ変わる。追加したリストのみ)
export const updateBoardList = (
  projectId: number,
  id: number,
  fields: { name?: string; color?: string },
) => request<BoardList>(`${base(projectId)}/${id}`, { method: 'PATCH', body: fields })

// すべてのリストの ID を、左から並べたい順に渡す
export const reorderBoardLists = (projectId: number, listIds: number[]) =>
  request<BoardList[]>(`${base(projectId)}/order`, { method: 'PUT', body: { list_ids: listIds } })

export const deleteBoardList = (projectId: number, id: number) =>
  request<void>(`${base(projectId)}/${id}`, { method: 'DELETE' })
