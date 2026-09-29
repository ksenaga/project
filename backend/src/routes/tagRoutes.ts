import { Router } from 'express'
import * as tagController from '../controllers/tagController'
import { authenticate } from '../middlewares/authenticate'

const router = Router()

router.use(authenticate)
router.get('/', tagController.list)

export default router
