import type { ProjectPhase } from '../constants/projectPhase'
import { request } from './client'
import type { Member } from './users'

export type Project = {
  id: number
  name: string
  detail: string
  deadline: string // "YYYY-MM-DD"
  phase: ProjectPhase
  // 進捗度 = done / total(total は未対応・対応中・レビュー中・完了のタスク数、done は完了のタスク数)
  progress: { done: number; total: number }
  members: Member[]
}

export type ProjectDetail = Project & {
  creater: Member
}

export type ProjectInput = Pick<Project, 'name' | 'detail' | 'deadline'> & {
  member_ids: number[]
}

export const fetchProjects = () => request<Project[]>('/projects')

export const fetchProject = (id: number) => request<ProjectDetail>(`/projects/${id}`)

export const createProject = (input: ProjectInput) =>
  request<ProjectDetail>('/projects', { method: 'POST', body: input })

export const updateProject = (id: number, input: ProjectInput) =>
  request<ProjectDetail>(`/projects/${id}`, { method: 'PATCH', body: input })

// フェーズの変更(管理者と、参画しているリーダー)
export const updateProjectPhase = (id: number, phase: ProjectPhase) =>
  request<ProjectDetail>(`/projects/${id}/phase`, { method: 'PATCH', body: { phase } })

export const deleteProject = (id: number) => request<void>(`/projects/${id}`, { method: 'DELETE' })

// 変更履歴の1件。body は変更した項目を1行ずつ書いたもの(作成は「プロジェクトを作成しました」から始まる)
export type ProjectLog = {
  id: number
  type: 'create' | 'change' | 'phase' // 作成 / 名前・詳細・期限・メンバーの変更 / フェーズの変更
  body: string
  user: Member // 操作した人
  created_at: string // ISO 8601
}

// 変更履歴(新しい順)。全ロールが見られる
export const fetchProjectLogs = (id: number) => request<ProjectLog[]>(`/projects/${id}/logs`)
