import { Router } from 'express'
import authRoutes from './authRoutes'
import projectRoutes from './projectRoutes'
import userRoutes from './userRoutes'

const router = Router()

router.use(authRoutes)
router.use('/projects', projectRoutes)
router.use('/users', userRoutes)

export default router
