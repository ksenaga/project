import { Router } from 'express'
import * as taskController from '../controllers/taskController'
import { authenticate } from '../middlewares/authenticate'

// /api/tasks/:id … タスク ID だけで開くとき(コメントの「#ID」など)に、プロジェクトを調べる
const router = Router()

router.use(authenticate)
router.get('/:id', taskController.location)

export default router
