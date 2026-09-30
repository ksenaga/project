import { notFound } from '../errors/HttpError'
import * as taskImageRepository from '../repositories/taskImageRepository'
import type { TaskImage } from '../types/task'
import type { AuthUser } from '../types/user'
import type { ImageContentType } from '../validators/image'
import { ensureProjectAccess } from './projectAccess'

// タスクに付かないまま、この時間がたった画像は削除する(貼ったあとに保存しなかった画像)
const UNATTACHED_KEEP_HOURS = 24
// 削除する処理を動かす間隔
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

// 修正内容に貼った画像を保存する(タスクを保存したときにタスクに付く)。
// 貼れるのはプロジェクトのメンバー(管理者は全プロジェクト)
export const upload = async (
  projectId: number,
  contentType: ImageContentType,
  data: Buffer,
  user: AuthUser,
): Promise<TaskImage> => {
  await ensureProjectAccess(projectId, user)
  const id = await taskImageRepository.create(projectId, contentType, data, user.id)
  return { id, url: taskImageRepository.imageUrl(projectId, id) }
}

// 画像を見られるのはプロジェクトのメンバー(管理者は全プロジェクト)
export const get = async (projectId: number, id: number, user: AuthUser) => {
  await ensureProjectAccess(projectId, user)
  const image = await taskImageRepository.findData(projectId, id, user.id)
  if (!image) throw notFound('画像が存在しません')
  return image
}

const cleanupSafely = () =>
  taskImageRepository
    .deleteUnattached(UNATTACHED_KEEP_HOURS)
    .catch((err: unknown) => console.error('使われていない画像の削除に失敗しました', err))

// サーバーの起動時に1回と、その後は一定の間隔で、タスクに付かなかった画像を削除する
export const startCleanup = () => {
  void cleanupSafely()
  setInterval(cleanupSafely, CLEANUP_INTERVAL_MS).unref()
}
