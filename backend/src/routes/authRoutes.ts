import { Router } from 'express'
import * as authController from '../controllers/authController'
import { authenticate } from '../middlewares/authenticate'

const router = Router()

router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.get('/me', authenticate, authController.me)

export default router
