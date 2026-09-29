import { db, type Conn } from '../db/knex'
import type { Member } from '../types/project'

// 複数プロジェクトのメンバーをまとめて取得する(追加した順)
export const findByProjectIds = async (
  projectIds: number[],
): Promise<(Member & { project_id: number })[]> => {
  if (projectIds.length === 0) return []
  return db('project_member as pm')
    .join('users as u', 'u.id', 'pm.user_id')
    .select('pm.project_id', 'u.id', 'u.name')
    .whereIn('pm.project_id', projectIds)
    .whereNull('u.deleted_at')
    .orderBy([{ column: 'pm.created_at' }, { column: 'u.id' }])
}

export const findUserIds = async (projectId: number, conn: Conn = db): Promise<number[]> => {
  const rows: { user_id: number }[] = await conn('project_member')
    .select('user_id')
    .where({ project_id: projectId })
  return rows.map((row) => row.user_id)
}

export const isMember = async (projectId: number, userId: number): Promise<boolean> => {
  const row = await db('project_member')
    .where({ project_id: projectId, user_id: userId })
    .first('user_id')
  return row !== undefined
}

export const add = async (
  projectId: number,
  userIds: number[],
  createrId: number,
  conn: Conn = db,
): Promise<void> => {
  if (userIds.length === 0) return
  await conn('project_member').insert(
    userIds.map((userId) => ({ project_id: projectId, user_id: userId, creater: createrId })),
  )
}

// メンバーから外す(物理削除)
export const remove = async (
  projectId: number,
  userIds: number[],
  conn: Conn = db,
): Promise<void> => {
  if (userIds.length === 0) return
  await conn('project_member').where({ project_id: projectId }).whereIn('user_id', userIds).delete()
}

// ユーザーが参画しているプロジェクト(削除済みは除く、期限が近い順)
export const findProjectsByUserId = async (
  userId: number,
): Promise<{ id: number; name: string }[]> =>
  db('project_member as pm')
    .join('projects as p', 'p.id', 'pm.project_id')
    .select('p.id', 'p.name')
    .where('pm.user_id', userId)
    .whereNull('p.deleted_at')
    .orderBy([{ column: 'p.deadline' }, { column: 'p.id' }])

// ユーザーを全プロジェクトから外す(ユーザー削除時)
export const removeUserFromAll = async (userId: number, conn: Conn = db): Promise<void> => {
  await conn('project_member').where({ user_id: userId }).delete()
}

// プロジェクトのメンバーのうち、指定した権限の(削除されていない)ユーザーの ID
export const findUserIdsByRole = async (projectId: number, role: number): Promise<number[]> => {
  const rows: { id: number }[] = await db('project_member as pm')
    .join('users as u', 'u.id', 'pm.user_id')
    .select('u.id')
    .where({ 'pm.project_id': projectId, 'u.role': role })
    .whereNull('u.deleted_at')
  return rows.map((row) => row.id)
}
