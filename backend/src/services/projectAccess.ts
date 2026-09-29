import { forbidden, notFound } from '../errors/HttpError'
import * as projectMemberRepository from '../repositories/projectMemberRepository'
import * as projectRepository from '../repositories/projectRepository'
import { ROLE, type AuthUser } from '../types/user'

// 管理者は全プロジェクト、それ以外はメンバーになっているプロジェクトだけ扱える
// (タスク・画面名の操作で使う)
export const ensureProjectAccess = async (projectId: number, user: AuthUser) => {
  const project = await projectRepository.findById(projectId)
  if (!project) throw notFound('プロジェクトが存在しません')
  if (user.role !== ROLE.ADMIN && !(await projectMemberRepository.isMember(projectId, user.id))) {
    throw forbidden()
  }
}
