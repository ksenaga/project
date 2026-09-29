import { Router } from 'express'
import * as projectController from '../controllers/projectController'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { ROLE } from '../types/user'
import screenRoutes from './screenRoutes'
import taskRoutes from './taskRoutes'

const router = Router()

// 全ロールが閲覧でき、作成・編集・削除は管理者のみ
router.use(authenticate)
router.get('/', projectController.list)
router.post('/', authorize(ROLE.ADMIN), projectController.create)
router.get('/:id', projectController.get)
router.patch('/:id', authorize(ROLE.ADMIN), projectController.update)
router.delete('/:id', authorize(ROLE.ADMIN), projectController.remove)

router.use('/:projectId/tasks', taskRoutes)
router.use('/:projectId/screens', screenRoutes)

export default router
