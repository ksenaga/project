import { Router } from 'express'
import authRoutes from './authRoutes'

const router = Router()

router.use(authRoutes)
// 今後ここに projects / tasks / users のルートを追加する

export default router
