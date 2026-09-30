import { Router } from 'express'
import * as taskController from '../controllers/taskController'
import { authorize } from '../middlewares/authorize'
import { ROLE } from '../types/user'
import commentRoutes from './commentRoutes'

// /api/projects/:projectId/tasks 配下。親ルーターの :projectId を使うため mergeParams を付ける
const router = Router({ mergeParams: true })

// 閲覧・作成・編集はプロジェクトメンバー全員(細かい制限は service)、削除は管理者・リーダーのみ
router.get('/', taskController.list)
router.post('/', taskController.create)
router.get('/:id', taskController.get)
router.patch('/:id', taskController.update)
router.delete('/:id', authorize(ROLE.ADMIN, ROLE.LEADER), taskController.remove)
// 中止依頼は一般ユーザーのみ(service で制限)
router.post('/:id/cancel-request', taskController.requestCancel)
router.use('/:taskId/comments', commentRoutes)

export default router
