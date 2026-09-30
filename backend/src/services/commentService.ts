import { forbidden, notFound } from '../errors/HttpError'
import * as commentRepository from '../repositories/commentRepository'
import * as taskRepository from '../repositories/taskRepository'
import * as userRepository from '../repositories/userRepository'
import { COMMENT_TYPE, type Comment } from '../types/comment'
import type { Member } from '../types/project'
import { ROLE, type AuthUser } from '../types/user'
import { findMentionedUsers } from './mention'
import * as notificationService from './notificationService'
import { ensureProjectAccess } from './projectAccess'

// コメントの閲覧・投稿はプロジェクトメンバー(管理者は全プロジェクト)。
// 削除は書いた本人と管理者のみ。移動の自動コメントは削除できない

const ensureTask = async (projectId: number, taskId: number, user: AuthUser) => {
  await ensureProjectAccess(projectId, user)
  const task = await taskRepository.findById(projectId, taskId)
  if (!task) throw notFound('タスクが存在しません')
  return task
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
  const task = await ensureTask(projectId, taskId, user)
  const id = await commentRepository.create(taskId, user.id, COMMENT_TYPE.COMMENT, body)
  // メンションされた人と、担当者へ通知する(書いた本人は除く)。
  // メンションされた担当者には、メンションの通知だけを送る(同じコメントで2つ届かないように)
  const mentioned = findMentionedUsers(body, await userRepository.findMentionable(projectId)).map(
    (mentionedUser) => mentionedUser.id,
  )
  await notificationService.notifyMentioned(projectId, task, body, mentioned, user)
  await notificationService.notifyCommented(projectId, task, body, user, mentioned)
  return (await commentRepository.findById(taskId, id))!
}

// コメントでメンションできるユーザー(プロジェクトのメンバーと管理者。名前順)
export const mentionable = async (
  projectId: number,
  taskId: number,
  user: AuthUser,
): Promise<Member[]> => {
  await ensureTask(projectId, taskId, user)
  return userRepository.findMentionable(projectId)
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
