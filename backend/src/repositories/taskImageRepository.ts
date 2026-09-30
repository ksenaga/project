import { db, type Conn } from '../db/knex'
import type { TaskImage } from '../types/task'
import type { ImageContentType } from '../validators/image'

// 画像の URL(画像は変わらないので、長くキャッシュさせてよい)
export const imageUrl = (projectId: number, id: number) =>
  `/api/projects/${projectId}/task-images/${id}`

// 貼った画像を保存する(まだタスクには付けない)。ID を返す
export const create = async (
  projectId: number,
  contentType: ImageContentType,
  data: Buffer,
  userId: number,
): Promise<number> => {
  const [id] = await db('task_images').insert({
    project_id: projectId,
    content_type: contentType,
    data,
    creater: userId,
  })
  return id
}

// 画像のデータ。タスクに付いていない画像は、貼った本人しか見られない
export const findData = (
  projectId: number,
  id: number,
  userId: number,
): Promise<{ content_type: ImageContentType; data: Buffer } | undefined> =>
  db('task_images')
    .select('content_type', 'data')
    .where({ id, project_id: projectId })
    .where((q) => q.whereNotNull('task_id').orWhere('creater', userId))
    .first()

// タスクの画像(並び順)
export const findByTask = async (projectId: number, taskId: number): Promise<TaskImage[]> => {
  const rows: { id: number }[] = await db('task_images')
    .select('id')
    .where({ task_id: taskId })
    .orderBy([{ column: 'position' }, { column: 'id' }])
  return rows.map((row) => ({ id: row.id, url: imageUrl(projectId, row.id) }))
}

// タスクの画像を ids(この順に並べる)にする。付いていない画像は削除する。
// 付けられるのは、今このタスクに付いている画像と、同じプロジェクトで本人が貼ったまだ付いていない画像だけ。
// それ以外が含まれていたら false を返す(何も変えない)
export const replaceForTask = async (
  projectId: number,
  taskId: number,
  ids: number[],
  userId: number,
  conn: Conn,
): Promise<boolean> => {
  if (ids.length > 0) {
    const usable = await conn('task_images')
      .whereIn('id', ids)
      .where({ project_id: projectId })
      .where((q) =>
        q
          .where({ task_id: taskId })
          .orWhere((p) => p.whereNull('task_id').where({ creater: userId })),
      )
      .count({ count: '*' })
      .first()
    if (Number(usable?.count ?? 0) !== ids.length) return false
  }
  await conn('task_images')
    .where({ task_id: taskId })
    .modify((q) => {
      if (ids.length > 0) q.whereNotIn('id', ids)
    })
    .delete()
  for (const [position, id] of ids.entries()) {
    await conn('task_images').where({ id }).update({ task_id: taskId, position })
  }
  return true
}

// タスクに付かないまま一定時間たった画像を削除する(貼ったあとに保存しなかった画像)。削除した件数を返す
export const deleteUnattached = async (olderThanHours: number): Promise<number> =>
  db('task_images')
    .whereNull('task_id')
    .where('created_at', '<', db.raw('NOW(3) - INTERVAL ? HOUR', [olderThanHours]))
    .delete()
