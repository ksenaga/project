import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { TOKEN_TTL_SECONDS } from '../config/auth'
import { env } from '../config/env'
import { unauthorized } from '../errors/HttpError'
import * as userRepository from '../repositories/userRepository'
import type { AuthUser } from '../types/user'

// ユーザーが存在しないときも bcrypt.compare を実行して、
// 応答時間の差からユーザー名の有無を推測されないようにするためのダミー
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12)

const signToken = (user: AuthUser): string =>
  jwt.sign({}, env.jwtSecret, {
    subject: String(user.id),
    expiresIn: TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  })

export const login = async (
  name: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> => {
  const row = await userRepository.findActiveByName(name)
  const ok = await bcrypt.compare(password, row?.password ?? DUMMY_HASH)
  if (!row || !ok) {
    throw unauthorized('ユーザー名またはパスワードが正しくありません')
  }

  const user: AuthUser = { id: row.id, name: row.name, role: row.role }
  return { user, token: signToken(user) }
}

// JWT を検証し、ログイン中のユーザーを返す。
// 削除されたユーザーや権限変更をすぐ反映するため、毎回 DB から取り直す
export const authenticate = async (token: string): Promise<AuthUser> => {
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
