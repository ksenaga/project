import type { NextFunction, Request, Response } from 'express'
import { forbidden, unauthorized } from '../errors/HttpError'
import type { Role } from '../types/user'

// authenticate の後に挟む。指定したロール以外は 403
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized()
    if (!roles.includes(req.user.role)) throw forbidden()
    next()
  }
