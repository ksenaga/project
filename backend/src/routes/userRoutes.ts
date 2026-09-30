import express, { Router } from 'express'
import * as userController from '../controllers/userController'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES, ROLE } from '../types/user'

const router = Router()

// 閲覧は全ロール。編集は管理者は全員、それ以外は自分だけ(service で制限)。作成・削除・ロックの解除は管理者のみ。
// アイコン画像は全ロールが見られ、設定・削除は編集と同じく管理者は全員、それ以外は自分だけ
router.use(authenticate)
router.get('/', userController.list)
router.post('/', authorize(ROLE.ADMIN), userController.create)
router.get('/:id', userController.get)
router.patch('/:id', userController.update)
router.delete('/:id', authorize(ROLE.ADMIN), userController.remove)
router.post('/:id/unlock', authorize(ROLE.ADMIN), userController.unlock)
router.get('/:id/avatar', userController.getAvatar)
router.put(
  '/:id/avatar',
  express.raw({ type: [...AVATAR_CONTENT_TYPES], limit: AVATAR_MAX_BYTES }),
  userController.saveAvatar,
)
router.delete('/:id/avatar', userController.removeAvatar)

export default router
