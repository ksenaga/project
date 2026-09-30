import { Router } from 'express'
import * as taskController from '../controllers/taskController'
import { authenticate } from '../middlewares/authenticate'

// プロジェクトをまたいでタスクを扱う
//   /api/tasks/mine … 自分が担当しているタスク(ヘッダーの「タスク一覧」)
//   /api/tasks/:id  … タスク ID だけで開くとき(コメントの「#ID」など)に、プロジェクトを調べる
const router = Router()

router.use(authenticate)
router.get('/mine', taskController.mine)
router.get('/:id', taskController.location)

export default router
