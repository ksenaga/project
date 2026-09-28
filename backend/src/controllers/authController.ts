import type { Request, Response } from 'express'
import { AUTH_COOKIE, authCookieOptions } from '../config/auth'
import { badRequest } from '../errors/HttpError'
import * as authService from '../services/authService'

// リクエストの受け取り・入力チェック・レスポンスの形を担当する

// POST /api/login
export const login = async (req: Request, res: Response) => {
  const { name, password } = req.body ?? {}
  if (typeof name !== 'string' || typeof password !== 'string') throw badRequest()
  if (name.trim() === '' || password === '') throw badRequest()

  const { user, token } = await authService.login(name.trim(), password)
  res.cookie(AUTH_COOKIE, token, authCookieOptions).json(user)
}

// POST /api/logout
export const logout = (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE, authCookieOptions).status(204).end()
}

// GET /api/me
export const me = (req: Request, res: Response) => {
  res.json(req.user)
}
