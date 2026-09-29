import { Router } from 'express'
import * as userController from '../controllers/userController'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { ROLE } from '../types/user'

const router = Router()

// 閲覧・編集は管理者は全員、それ以外は自分だけ(service で制限)。作成・削除は管理者のみ
router.use(authenticate)
router.get('/', userController.list)
router.post('/', authorize(ROLE.ADMIN), userController.create)
router.get('/:id', userController.get)
router.patch('/:id', userController.update)
router.delete('/:id', authorize(ROLE.ADMIN), userController.remove)

export default router
