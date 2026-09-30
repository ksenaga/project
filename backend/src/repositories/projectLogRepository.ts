import { db, type Conn } from '../db/knex'
import type { ProjectLog, ProjectLogType } from '../types/projectLog'
import { toMember } from './userRepository'

// 新しい順(削除されたユーザーの操作も、そのときの名前で残す)
export const findByProject = async (projectId: number): Promise<ProjectLog[]> => {
  const rows: {
    id: number
    type: ProjectLogType
    body: string
    created_at: Date
    user_id: number
    user_name: string
    user_avatar_updated_at: Date | null
  }[] = await db('project_logs as l')
    .join('users as u', 'u.id', 'l.user_id')
    .select(
      'l.id',
      'l.type',
      'l.body',
      'l.created_at',
      'u.id as user_id',
      'u.name as user_name',
      'u.avatar_updated_at as user_avatar_updated_at',
    )
    .where('l.project_id', projectId)
    .orderBy([
      { column: 'l.created_at', order: 'desc' },
      { column: 'l.id', order: 'desc' },
    ])
  return rows.map(({ user_id, user_name, user_avatar_updated_at, created_at, ...rest }) => ({
    ...rest,
    user: toMember({ id: user_id, name: user_name, avatar_updated_at: user_avatar_updated_at }),
    created_at: new Date(created_at).toISOString(),
  }))
}

export const create = async (
  projectId: number,
  userId: number,
  type: ProjectLogType,
  body: string,
  conn: Conn = db,
): Promise<void> => {
  await conn('project_logs').insert({ project_id: projectId, user_id: userId, type, body })
}
