import { Router } from 'express'
import authRoutes from './authRoutes'
import projectRoutes from './projectRoutes'
import tagRoutes from './tagRoutes'
import userRoutes from './userRoutes'

const router = Router()

router.use(authRoutes)
router.use('/projects', projectRoutes)
router.use('/users', userRoutes)
router.use('/tags', tagRoutes)

export default router
