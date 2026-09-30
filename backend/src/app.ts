import path from 'node:path'
import cookieParser from 'cookie-parser'
import express from 'express'
import { env } from './config/env'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import apiRoutes from './routes'

export const app = express()

app.use(express.json())
app.use(cookieParser())

app.use('/api', apiRoutes)

// ビルドしたフロントエンドを配る(STATIC_DIR を指定したときだけ)
if (env.staticDir) {
  const staticDir = env.staticDir
  app.use(
    express.static(staticDir, {
      index: false,
      // assets/ のファイルは名前に中身のハッシュが付くので、長くキャッシュしてよい
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )
  // /projects/1/tasks や /tasks/12 などの画面の URL には index.html を返す(画面の切り替えは React が行う)。
  // /api で始まる URL は API の 404 にする
  app.get('/{*path}', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) return next()
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(staticDir, 'index.html'))
  })
}

app.use(notFoundHandler)
app.use(errorHandler)
