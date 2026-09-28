import type { CookieOptions } from 'express'
import { env } from './env'

// JWT を入れる Cookie 名
export const AUTH_COOKIE = 'token'

// JWT の有効期限(秒)。Cookie の有効期限も同じにする
export const TOKEN_TTL_SECONDS = 60 * 60 * 24

export const authCookieOptions: CookieOptions = {
  httpOnly: true, // JS から読めないようにして XSS での盗難を防ぐ
  secure: env.isProduction, // 本番(HTTPS)のみ Secure を付ける
  sameSite: 'lax',
  path: '/',
  maxAge: TOKEN_TTL_SECONDS * 1000,
}
