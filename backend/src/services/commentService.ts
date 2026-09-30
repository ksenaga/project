import { forbidden, notFound } from '../errors/HttpError'
import * as commentRepository from '../repositories/commentRepository'
import * as taskRepository from '../repositories/taskRepository'
import { COMMENT_TYPE, type Comment } from '../types/comment'
import { ROLE, type AuthUser } from '../types/user'
import { ensureProjectAccess } from './projectAccess'

// コメントの閲覧・投稿はプロジェクトメンバー(管理者は全プロジェクト)。
// 削除は書いた本人と管理者のみ。移動の自動コメントは削除できない

const ensureTask = async (projectId: number, taskId: number, user: AuthUser) => {
  await ensureProjectAccess(projectId, user)
  if (!(await taskRepository.findById(projectId, taskId))) throw notFound('タスクが存在しません')
}

export const list = async (
  projectId: number,
  taskId: number,
  user: AuthUser,
): Promise<Comment[]> => {
  await ensureTask(projectId, taskId, user)
  return commentRepository.findByTask(taskId)
}

export const create = async (
  projectId: number,
  taskId: number,
  body: string,
  user: AuthUser,
): Promise<Comment> => {
  await ensureTask(projectId, taskId, user)
  const id = await commentRepository.create(taskId, user.id, COMMENT_TYPE.COMMENT, body)
  return (await commentRepository.findById(taskId, id))!
}

export const remove = async (
  projectId: number,
  taskId: number,
  id: number,
  user: AuthUser,
): Promise<void> => {
  await ensureTask(projectId, taskId, user)
  const comment = await commentRepository.findById(taskId, id)
  if (!comment) throw notFound('コメントが存在しません')
  if (comment.type !== COMMENT_TYPE.COMMENT)
    throw forbidden('自動で記録されたコメントは削除できません')
  if (comment.user.id !== user.id && user.role !== ROLE.ADMIN) throw forbidden()
  await commentRepository.remove(taskId, id)
}
