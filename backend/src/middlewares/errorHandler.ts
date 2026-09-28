import type { NextFunction, Request, Response } from 'express'
import { HttpError, notFound } from '../errors/HttpError'

// どのルートにも一致しなかったとき
export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(notFound())
}

// Express 5 では async 関数内で throw したエラーもここに届く
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message })
    return
  }
  // JSON の形式が壊れているリクエスト
  if (err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'リクエストが不正です。' })
    return
  }

  console.error(err)
  res.status(500).json({ message: 'サーバーエラーが発生しました' })
}
