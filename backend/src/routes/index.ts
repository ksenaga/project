import { Router } from 'express'
import authRoutes from './authRoutes'
import notificationRoutes from './notificationRoutes'
import projectRoutes from './projectRoutes'
import tagRoutes from './tagRoutes'
import taskLocationRoutes from './taskLocationRoutes'
import userRoutes from './userRoutes'

const router = Router()

router.use(authRoutes)
router.use('/projects', projectRoutes)
router.use('/users', userRoutes)
router.use('/tags', tagRoutes)
router.use('/tasks', taskLocationRoutes)
router.use('/notifications', notificationRoutes)

export default router
