import { db, type Conn } from '../db/knex'
import type { Notification, NotificationType } from '../types/notification'

type NewNotification = {
  user_id: number
  type: NotificationType
  project_id: number
  task_id: number | null
  actor_id: number
  message: string
}

export const createMany = async (rows: NewNotification[], conn: Conn = db): Promise<void> => {
  if (rows.length === 0) return
  await conn('notifications').insert(rows)
}

type Row = Omit<Notification, 'read' | 'created_at'> & { read_at: Date | null; created_at: Date }

// 新しい順(削除されたプロジェクトの通知は出さない)
export const findByUser = async (userId: number, limit: number): Promise<Notification[]> => {
  const rows: Row[] = await db('notifications as n')
    .join('projects as p', 'p.id', 'n.project_id')
    .select('n.id', 'n.type', 'n.project_id', 'n.task_id', 'n.message', 'n.read_at', 'n.created_at')
    .where('n.user_id', userId)
    .whereNull('p.deleted_at')
    .orderBy([
      { column: 'n.created_at', order: 'desc' },
      { column: 'n.id', order: 'desc' },
    ])
    .limit(limit)
  return rows.map(({ read_at, created_at, ...rest }) => ({
    ...rest,
    read: read_at !== null,
    created_at: new Date(created_at).toISOString(),
  }))
}

export const countUnread = async (userId: number): Promise<number> => {
  const row = await db('notifications as n')
    .join('projects as p', 'p.id', 'n.project_id')
    .where('n.user_id', userId)
    .whereNull('n.read_at')
    .whereNull('p.deleted_at')
    .count({ count: '*' })
    .first()
  return Number(row?.count ?? 0)
}

// 自分の通知だけ既読にできる。更新した件数を返す
export const markRead = async (userId: number, id: number): Promise<number> =>
  db('notifications')
    .where({ id, user_id: userId })
    .whereNull('read_at')
    .update({ read_at: db.fn.now(3) })

export const markAllRead = async (userId: number): Promise<void> => {
  await db('notifications')
    .where({ user_id: userId })
    .whereNull('read_at')
    .update({ read_at: db.fn.now(3) })
}
