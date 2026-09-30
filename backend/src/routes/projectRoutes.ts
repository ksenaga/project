import { Router } from 'express'
import * as projectController from '../controllers/projectController'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { ROLE } from '../types/user'
import boardListRoutes from './boardListRoutes'
import screenRoutes from './screenRoutes'
import taskRoutes from './taskRoutes'

const router = Router()

// 全ロールが閲覧できる。作成・削除は管理者のみ
router.use(authenticate)
router.get('/', projectController.list)
router.post('/', authorize(ROLE.ADMIN), projectController.create)
router.get('/:id', projectController.get)
router.get('/:id/logs', projectController.logs)
// 編集・フェーズの変更は、管理者と、参画しているリーダー(service で制限)
router.patch('/:id', projectController.update)
router.patch('/:id/phase', projectController.updatePhase)
router.delete('/:id', authorize(ROLE.ADMIN), projectController.remove)

router.use('/:projectId/tasks', taskRoutes)
router.use('/:projectId/screens', screenRoutes)
router.use('/:projectId/lists', boardListRoutes)

export default router
