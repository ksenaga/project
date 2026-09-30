import { Router } from 'express'
import * as commentController from '../controllers/commentController'

// /api/projects/:projectId/tasks/:taskId/comments 配下。親ルーターの :projectId・:taskId を使う
const router = Router({ mergeParams: true })

// 閲覧・投稿はプロジェクトメンバー、削除は書いた本人と管理者(service で制限)
router.get('/', commentController.list)
router.get('/mentionable-users', commentController.mentionable)
router.post('/', commentController.create)
router.delete('/:id', commentController.remove)

export default router
