import { db } from '../db/knex'
import { badRequest, conflict, forbidden, notFound } from '../errors/HttpError'
import * as projectMemberRepository from '../repositories/projectMemberRepository'
import * as tagRepository from '../repositories/tagRepository'
import * as taskRepository from '../repositories/taskRepository'
import {
  CLOSED_STATUSES,
  CREATABLE_STATUSES,
  CUSTOM_LIST_STATUS,
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
import * as boardListService from './boardListService'
import * as notificationService from './notificationService'
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

// タグは用意されたものから選ぶ
const ensureTagsExist = async (tagIds: number[] | undefined) => {
  if (!tagIds || tagIds.length === 0) return
  if ((await tagRepository.countByIds(tagIds)) !== tagIds.length) {
    throw badRequest('存在しないタグが含まれています')
  }
}

// 担当者(user_ids)・タグ(tag_ids)と、tasks テーブルに書き込む値に分ける
const splitInput = <T extends Partial<TaskInput>>({ user_ids, tag_ids, ...fields }: T) => ({
  userIds: user_ids,
  tagIds: tag_ids,
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
  options: { withDetail?: boolean } = {},
): Promise<(TaskSummary | Task)[]> => {
  await ensureProjectAccess(projectId, user)
  return taskRepository.findByProject(projectId, filter, options)
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
  if (!CREATABLE_STATUSES.includes(input.status) || input.list_id) {
    throw badRequest('タスクは未対応か対応中で作成してください')
  }
  await ensureAssigneesAreMembers(projectId, input.user_ids)
  await ensureScreenInProject(projectId, input.screen_id)
  await ensureTagsExist(input.tag_ids)

  const { fields } = splitInput(input)
  const id = await db.transaction(async (trx) => {
    const taskId = await taskRepository.create(projectId, fields as TaskFields, user.id, trx)
    await taskRepository.replaceAssignees(taskId, input.user_ids, trx)
    await taskRepository.replaceTags(taskId, input.tag_ids, trx)
    return taskId
  })
  const created = await getTask(projectId, id)
  await notificationService.notifyAssigned(projectId, created, input.user_ids, user)
  return created
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
      (input.status !== current.status || current.list_id !== null) &&
      !MEMBER_SETTABLE_STATUSES.includes(input.status)
    ) {
      throw forbidden()
    }
  }

  // 追加したリストへの移動(status は「対応中」にして未完了として扱う)。
  // 既存の5つのリストへの移動(status の指定)では、追加したリストから外す
  if (input.list_id !== undefined && input.status !== undefined) throw badRequest()
  if (input.list_id) {
    if (!(await boardListService.findCustomList(projectId, input.list_id))) {
      throw badRequest('リストが存在しません')
    }
    input = { ...input, status: CUSTOM_LIST_STATUS }
  } else if (input.status !== undefined || input.list_id === null) {
    input = { ...input, list_id: null }
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

  await ensureTagsExist(input.tag_ids)

  const { userIds, tagIds, fields } = splitInput(input)
  await db.transaction(async (trx) => {
    const count = await taskRepository.update(projectId, id, fields, user.id, trx)
    if (count === 0) throw taskNotFound()
    if (userIds !== undefined) await taskRepository.replaceAssignees(id, userIds, trx)
    if (tagIds !== undefined) await taskRepository.replaceTags(id, tagIds, trx)
  })
  const updated = await getTask(projectId, id)

  // 新しく担当者になった人へ通知する
  const before = current.assignees.map((assignee) => assignee.id)
  const newAssignees = updated.assignees
    .map((a) => a.id)
    .filter((userId) => !before.includes(userId))
  await notificationService.notifyAssigned(projectId, updated, newAssignees, user)

  // レビュー中になったら、管理者と担当リーダーへ通知する
  const isReview = (task: Task) => task.status === TASK_STATUS.REVIEW && task.list_id === null
  if (isReview(updated) && !isReview(current)) {
    await notificationService.notifyReviewRequested(projectId, updated, user)
  }
  return updated
}

// 中止依頼(担当者に含まれる一般ユーザーのみ)。管理者と担当リーダーに通知する。通知した人数を返す
export const requestCancel = async (
  projectId: number,
  id: number,
  reason: string | null,
  user: AuthUser,
): Promise<number> => {
  await ensureProjectAccess(projectId, user)
  // 管理者・リーダーは自分で対応中止にできるので、依頼はできない
  if (user.role !== ROLE.MEMBER) throw forbidden()
  const task = await getTask(projectId, id)
  // 担当者以外は依頼できない
  if (!task.assignees.some((assignee) => assignee.id === user.id)) {
    throw forbidden('担当しているタスクのみ中止を依頼できます')
  }
  if (CLOSED_STATUSES.includes(task.status) && task.list_id === null) {
    throw conflict('完了・対応中止のタスクは中止を依頼できません')
  }
  return notificationService.notifyCancelRequested(projectId, task, reason, user)
}

// 削除できるのは管理者・リーダー(ルートで制限)
export const remove = async (projectId: number, id: number, user: AuthUser): Promise<void> => {
  await ensureProjectAccess(projectId, user)
  const count = await taskRepository.softDelete(projectId, id, user.id)
  if (count === 0) throw taskNotFound()
}
