import { Router } from 'express'
import * as boardListController from '../controllers/boardListController'

// /api/projects/:projectId/lists 配下。親ルーターの :projectId を使うため mergeParams を付ける
const router = Router({ mergeParams: true })

// 閲覧はプロジェクトメンバー、変更は管理者と担当しているリーダー(service で制限)
router.get('/', boardListController.list)
router.post('/', boardListController.create)
router.put('/order', boardListController.reorder)
router.patch('/:id', boardListController.update)
router.delete('/:id', boardListController.remove)

export default router
