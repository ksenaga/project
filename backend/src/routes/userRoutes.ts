import { Router } from 'express'
import * as userController from '../controllers/userController'
import { authenticate } from '../middlewares/authenticate'

const router = Router()

router.use(authenticate)
router.get('/', userController.list)

export default router
