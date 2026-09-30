import type { UserProfile } from './user'

declare global {
  namespace Express {
    interface Request {
      // authenticate ミドルウェアを通ったリクエストにだけ入る
      user?: UserProfile
    }
  }
}

export {}
