import type { NextFunction, Request, Response } from 'express'
import { AUTH_COOKIE } from '../config/auth'
import { unauthorized } from '../errors/HttpError'
import * as authService from '../services/authService'

// ログイン必須の API の前に挟む。成功すると req.user にログインユーザーが入る
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE]
  if (typeof token !== 'string' || token === '') throw unauthorized()

  req.user = await authService.authenticate(token)
  next()
}
