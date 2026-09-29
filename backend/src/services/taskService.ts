import { badRequest, conflict, forbidden, notFound } from '../errors/HttpError'
import * as projectMemberRepository from '../repositories/projectMemberRepository'
import * as projectRepository from '../repositories/projectRepository'
import * as taskRepository from '../repositories/taskRepository'
import {
  CREATABLE_STATUSES,
  MEMBER_EDITABLE_FIELDS,
  MEMBER_SETTABLE_STATUSES,
  TASK_STATUS,
  type Task,
  type TaskInput,
  type TaskSummary,
} from '../types/task'
import { ROLE, type AuthUser } from '../types/user'

const taskNotFound = () => notFound('タスクが存在しません')

// 管理者は全プロジェクト、それ以外はメンバーになっているプロジェクトのタスクだけ扱える
const ensureProjectAccess = async (projectId: number, user: AuthUser) => {
  const project = await projectRepository.findById(projectId)
  if (!project) throw notFound('プロジェクトが存在しません')
  if (user.role !== ROLE.ADMIN && !(await projectMemberRepository.isMember(projectId, user.id))) {
    throw forbidden()
  }
}

// タスクには必ずプロジェクトメンバーの担当者を設定する
const ensureAssigneeIsMember = async (projectId: number, userId: number) => {
  if (!(await projectMemberRepository.isMember(projectId, userId))) {
    throw badRequest('担当者はプロジェクトメンバーから選んでください')
  }
}

const getTask = async (projectId: number, id: number): Promise<Task> => {
  const task = await taskRepository.findById(projectId, id)
  if (!task) throw taskNotFound()
  return task
}

export const list = async (projectId: number, user: AuthUser): Promise<TaskSummary[]> => {
  await ensureProjectAccess(projectId, user)
  return taskRepository.findByProject(projectId)
}

export const get = async (projectId: number, id: number, user: AuthUser): Promise<Task> => {
  await ensureProjectAccess(projectId, user)
  return getTask(projectId, id)
}

export const create = async (
  projectId: number,
  input: TaskInput,
  user: AuthUser,
): Promise<Task> => {
  await ensureProjectAccess(projectId, user)
  if (!CREATABLE_STATUSES.includes(input.status)) {
    throw badRequest('タスクは未対応か対応中で作成してください')
  }
  await ensureAssigneeIsMember(projectId, input.user_id)

  const id = await taskRepository.create(projectId, input, user.id)
  return getTask(projectId, id)
}

export const update = async (
  projectId: number,
  id: number,
  input: Partial<TaskInput>,
  user: AuthUser,
): Promise<Task> => {
  await ensureProjectAccess(projectId, user)
  const current = await getTask(projectId, id)

  if (current.status === TASK_STATUS.DONE) throw conflict('完了したタスクは編集できません')

  // 一般ユーザーは自分が担当するタスクの、決められた項目だけ編集できる
  if (user.role === ROLE.MEMBER) {
    if (current.assignee.id !== user.id) throw forbidden()
    const editable: readonly string[] = MEMBER_EDITABLE_FIELDS
    if (Object.keys(input).some((key) => !editable.includes(key))) throw forbidden()
    if (
      input.status !== undefined &&
      input.status !== current.status &&
      !MEMBER_SETTABLE_STATUSES.includes(input.status)
    ) {
      throw forbidden()
    }
  }

  if (input.user_id !== undefined && input.user_id !== current.assignee.id) {
    await ensureAssigneeIsMember(projectId, input.user_id)
  }

  const count = await taskRepository.update(projectId, id, input, user.id)
  if (count === 0) throw taskNotFound()
  return getTask(projectId, id)
}

// 削除できるのは管理者・リーダー(ルートで制限)
export const remove = async (projectId: number, id: number, user: AuthUser): Promise<void> => {
  await ensureProjectAccess(projectId, user)
  const count = await taskRepository.softDelete(projectId, id, user.id)
  if (count === 0) throw taskNotFound()
}
