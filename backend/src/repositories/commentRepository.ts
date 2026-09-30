import { db, type Conn } from '../db/knex'
import { COMMENT_TYPE, type Comment, type CommentType } from '../types/comment'

type Row = Omit<Comment, 'user' | 'created_at'> & {
  user_id: number
  user_name: string
  created_at: Date
}

const toComment = ({ user_id, user_name, created_at, ...rest }: Row): Comment => ({
  ...rest,
  user: { id: user_id, name: user_name },
  created_at: new Date(created_at).toISOString(),
})

const columns = [
  'c.id',
  'c.type',
  'c.body',
  'c.created_at',
  'u.id as user_id',
  'u.name as user_name',
]

// 古い順(削除されたユーザーのコメントも、書いたときの名前で残す)
export const findByTask = async (taskId: number): Promise<Comment[]> => {
  const rows: Row[] = await db('task_comments as c')
    .join('users as u', 'u.id', 'c.user_id')
    .select(columns)
    .where('c.task_id', taskId)
    .orderBy([{ column: 'c.created_at' }, { column: 'c.id' }])
  return rows.map(toComment)
}

export const findById = async (taskId: number, id: number): Promise<Comment | undefined> => {
  const row: Row | undefined = await db('task_comments as c')
    .join('users as u', 'u.id', 'c.user_id')
    .select(columns)
    .where({ 'c.task_id': taskId, 'c.id': id })
    .first()
  return row && toComment(row)
}

export const create = async (
  taskId: number,
  userId: number,
  type: CommentType,
  body: string,
  conn: Conn = db,
): Promise<number> => {
  const [id] = await conn('task_comments').insert({ task_id: taskId, user_id: userId, type, body })
  return id
}

// 物理削除。削除した件数を返す
export const remove = async (taskId: number, id: number): Promise<number> =>
  db('task_comments').where({ task_id: taskId, id }).delete()

// 複数タスクの、人が書いたコメントの数(自動コメントは数えない)
export const countByTaskIds = async (taskIds: number[]): Promise<Map<number, number>> => {
  const map = new Map<number, number>()
  if (taskIds.length === 0) return map
  const rows: { task_id: number; count: number | string }[] = await db('task_comments')
    .select('task_id')
    .count({ count: '*' })
    .whereIn('task_id', taskIds)
    .where({ type: COMMENT_TYPE.COMMENT })
    .groupBy('task_id')
  for (const row of rows) map.set(row.task_id, Number(row.count))
  return map
}
