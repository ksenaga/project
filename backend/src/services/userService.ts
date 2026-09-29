import * as userRepository from '../repositories/userRepository'
import { ROLE, type AuthUser } from '../types/user'

// 管理者は全ユーザー、それ以外は自分だけ
export const list = async (user: AuthUser): Promise<AuthUser[]> => {
  if (user.role === ROLE.ADMIN) return userRepository.findAllActive()
  return [user]
}
