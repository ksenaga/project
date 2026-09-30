import type { NextFunction, Request, Response } from 'express'
import { HttpError, notFound } from '../errors/HttpError'

// どのルートにも一致しなかったとき
export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(notFound())
}

// Express 5 では async 関数内で throw したエラーもここに届く
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res
      .status(err.status)
      .json(err.code ? { message: err.message, code: err.code } : { message: err.message })
    return
  }
  // JSON の形式が壊れているリクエスト
  if (err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'リクエストが不正です。' })
    return
  }
  // 本文が大きすぎる(アイコン画像など)
  if (err instanceof Error && 'type' in err && err.type === 'entity.too.large') {
    res.status(413).json({ message: 'データが大きすぎます' })
    return
  }

  console.error(err)
  res.status(500).json({ message: 'サーバーエラーが発生しました' })
}
