import express, { Router } from 'express'
import * as taskImageController from '../controllers/taskImageController'
import { TASK_IMAGE_MAX_BYTES } from '../types/task'
import { IMAGE_CONTENT_TYPES } from '../validators/image'

// /api/projects/:projectId/task-images 配下。修正内容に貼る画像
// 貼る・見るのはプロジェクトのメンバー(管理者は全プロジェクト。service で制限)
const router = Router({ mergeParams: true })

router.post(
  '/',
  express.raw({ type: [...IMAGE_CONTENT_TYPES], limit: TASK_IMAGE_MAX_BYTES }),
  taskImageController.upload,
)
router.get('/:id', taskImageController.get)

export default router
