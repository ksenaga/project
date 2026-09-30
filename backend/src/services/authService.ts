import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { TOKEN_TTL_SECONDS } from '../config/auth'
import { env } from '../config/env'
import { locked, unauthorized } from '../errors/HttpError'
import * as userRepository from '../repositories/userRepository'
import { MAX_LOGIN_FAILURES, type AuthUser, type UserProfile } from '../types/user'

// ユーザーが存在しないときも bcrypt.compare を実行して、
// 応答時間の差からユーザー名の有無を推測されないようにするためのダミー
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12)

const signToken = (user: AuthUser): string =>
  jwt.sign({}, env.jwtSecret, {
    subject: String(user.id),
    expiresIn: TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  })

// ロック中のエラー。あと何分でログインできるかを伝える
const accountLocked = (lockSeconds: number) =>
  locked(
    `ログインに${MAX_LOGIN_FAILURES}回続けて失敗したため、ロックしています。` +
      `約${Math.ceil(lockSeconds / 60)}分後にもう一度お試しください`,
  )

// パスワードを MAX_LOGIN_FAILURES 回続けて間違えると、一定時間ログインできなくする(総当たり対策)。
// ロック中は正しいパスワードでもログインできない。ログインに成功すると失敗の回数は0に戻る
export const login = async (
  name: string,
  password: string,
): Promise<{ user: UserProfile; token: string }> => {
  const row = await userRepository.findActiveByName(name)
  if (row && row.lock_seconds !== null && row.lock_seconds > 0) {
    throw accountLocked(row.lock_seconds)
  }
  const ok = await bcrypt.compare(password, row?.password ?? DUMMY_HASH)
  if (!row || !ok) {
    if (row) {
      const lockSeconds = await userRepository.recordLoginFailure(row.id)
      if (lockSeconds !== null) throw accountLocked(lockSeconds)
    }
    throw unauthorized('ユーザー名またはパスワードが正しくありません')
  }

  await userRepository.clearLoginFailures(row.id)
  const user: UserProfile = {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar_url: userRepository.avatarUrl(row.id, row.avatar_updated_at),
  }
  return { user, token: signToken(user) }
}

// JWT を検証し、ログイン中のユーザーを返す。
// 削除されたユーザーや権限変更をすぐ反映するため、毎回 DB から取り直す
export const authenticate = async (token: string): Promise<UserProfile> => {
  let userId: number
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] })
    userId = Number(typeof payload === 'string' ? NaN : payload.sub)
  } catch {
    throw unauthorized()
  }
  if (!Number.isInteger(userId)) throw unauthorized()

  const user = await userRepository.findActiveById(userId)
  if (!user) throw unauthorized()
  return user
}
