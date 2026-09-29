import { Router } from 'express'
import * as screenController from '../controllers/screenController'

// /api/projects/:projectId/screens 配下。親ルーターの :projectId を使うため mergeParams を付ける
const router = Router({ mergeParams: true })

// プロジェクトメンバー全員が追加・編集・削除できる(service で制限)
router.get('/', screenController.list)
router.post('/', screenController.create)
router.patch('/:id', screenController.update)
router.delete('/:id', screenController.remove)

export default router
