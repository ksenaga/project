import { db } from '../db/knex'
import { badRequest, conflict, forbidden, notFound } from '../errors/HttpError'
import * as projectMemberRepository from '../repositories/projectMemberRepository'
import * as taskRepository from '../repositories/taskRepository'
import {
  CREATABLE_STATUSES,
  MEMBER_EDITABLE_FIELDS,
  MEMBER_SETTABLE_STATUSES,
  TASK_STATUS,
  type Task,
  type TaskFields,
  type TaskFilter,
  type TaskInput,
  type TaskSummary,
} from '../types/task'
import { ROLE, type AuthUser } from '../types/user'
import { ensureProjectAccess } from './projectAccess'
import * as screenService from './screenService'

const taskNotFound = () => notFound('タスクが存在しません')

// タスクには必ずプロジェクトメンバーの担当者を設定する(1人以上)
const ensureAssigneesAreMembers = async (projectId: number, userIds: number[]) => {
  const members = await projectMemberRepository.findUserIds(projectId)
  if (userIds.some((userId) => !members.includes(userId))) {
    throw badRequest('担当者はプロジェクトメンバーから選んでください')
  }
}

// 担当者(user_ids)と、tasks テーブルに書き込む値に分ける
const splitInput = <T extends Partial<TaskInput>>({ user_ids, ...fields }: T) => ({
  userIds: user_ids,
  fields: fields as Partial<TaskFields>,
})

const getTask = async (projectId: number, id: number): Promise<Task> => {
  const task = await taskRepository.findById(projectId, id)
  if (!task) throw taskNotFound()
  return task
}

// 画面名はそのプロジェクトに登録されているものから選ぶ
const ensureScreenInProject = async (projectId: number, screenId: number | undefined) => {
  if (screenId === undefined) return
  if (!(await screenService.exists(projectId, screenId))) {
    throw badRequest('画面名はプロジェクトに登録されているものから選んでください')
  }
}

export const list = async (
  projectId: number,
  filter: TaskFilter,
  user: AuthUser,
): Promise<TaskSummary[]> => {
  await ensureProjectAccess(projectId, user)
  return taskRepository.findByProject(projectId, filter)
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
  await ensureAssigneesAreMembers(projectId, input.user_ids)
  await ensureScreenInProject(projectId, input.screen_id)

  const { fields } = splitInput(input)
  const id = await db.transaction(async (trx) => {
    const taskId = await taskRepository.create(projectId, fields as TaskFields, user.id, trx)
    await taskRepository.replaceAssignees(taskId, input.user_ids, trx)
    return taskId
  })
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

  // 一般ユーザーは自分が担当者に含まれるタスクの、決められた項目だけ編集できる
  if (user.role === ROLE.MEMBER) {
    if (!current.assignees.some((assignee) => assignee.id === user.id)) throw forbidden()
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

  // 新しく追加する担当者はプロジェクトメンバーから選ぶ
  // (プロジェクトから外れた人が今の担当者に残っているのはよい)
  if (input.user_ids !== undefined) {
    const currentIds = current.assignees.map((assignee) => assignee.id)
    await ensureAssigneesAreMembers(
      projectId,
      input.user_ids.filter((userId) => !currentIds.includes(userId)),
    )
  }
  await ensureScreenInProject(projectId, input.screen_id)

  const { userIds, fields } = splitInput(input)
  await db.transaction(async (trx) => {
    const count = await taskRepository.update(projectId, id, fields, user.id, trx)
    if (count === 0) throw taskNotFound()
    if (userIds !== undefined) await taskRepository.replaceAssignees(id, userIds, trx)
  })
  return getTask(projectId, id)
}

// 削除できるのは管理者・リーダー(ルートで制限)
export const remove = async (projectId: number, id: number, user: AuthUser): Promise<void> => {
  await ensureProjectAccess(projectId, user)
  const count = await taskRepository.softDelete(projectId, id, user.id)
  if (count === 0) throw taskNotFound()
}
