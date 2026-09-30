import cookieParser from 'cookie-parser'
import express from 'express'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import apiRoutes from './routes'

export const app = express()

app.use(express.json())
app.use(cookieParser())

app.use('/api', apiRoutes)

app.use(notFoundHandler)
app.use(errorHandler)
