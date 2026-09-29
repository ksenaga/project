import { request } from './client'
import type { Member } from './users'

export type Project = {
  id: number
  name: string
  detail: string
  deadline: string // "YYYY-MM-DD"
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

export const deleteProject = (id: number) => request<void>(`/projects/${id}`, { method: 'DELETE' })
