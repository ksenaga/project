import { db, type Conn } from '../db/knex'
import { badRequest, conflict, forbidden, notFound } from '../errors/HttpError'
import * as boardListRepository from '../repositories/boardListRepository'
import * as projectMemberRepository from '../repositories/projectMemberRepository'
import * as projectRepository from '../repositories/projectRepository'
import * as taskRepository from '../repositories/taskRepository'
import * as userRepository from '../repositories/userRepository'
import * as notificationService from './notificationService'
import type {
  Project,
  ProjectBase,
  ProjectDetail,
  ProjectInput,
  ProjectPhase,
  ProjectRequest,
} from '../types/project'
import { INCOMPLETE_STATUSES } from '../types/task'
import { ROLE, type AuthUser } from '../types/user'

const projectNotFound = () => notFound('プロジェクトが存在しません')

// プロジェクトにメンバーを付ける
const withMembers = async (projects: ProjectBase[]): Promise<Project[]> => {
  const rows = await projectMemberRepository.findByProjectIds(projects.map((p) => p.id))
  return projects.map((project) => ({
    ...project,
    members: rows
      .filter((row) => row.project_id === project.id)
      .map(({ id, name }) => ({ id, name })),
  }))
}

const ensureUsersExist = async (userIds: number[], conn: Conn) => {
  const count = await userRepository.countActiveByIds(userIds, conn)
  if (count !== userIds.length) throw badRequest('存在しないユーザーが含まれています')
}

const pickProjectInput = (input: Partial<ProjectRequest>): Partial<ProjectInput> => {
  const { name, detail, deadline } = input
  return Object.fromEntries(
    Object.entries({ name, detail, deadline }).filter(([, value]) => value !== undefined),
  )
}

export const list = async (): Promise<Project[]> => withMembers(await projectRepository.findAll())

export const get = async (id: number): Promise<ProjectDetail> => {
  const project = await projectRepository.findById(id)
  const creater = await projectRepository.findCreaterById(id)
  if (!project || !creater) throw projectNotFound()
  const [withMember] = await withMembers([project])
  return { ...withMember, creater }
}

// プロジェクトとメンバーを同じトランザクションで登録する
export const create = async (input: ProjectRequest, user: AuthUser): Promise<ProjectDetail> => {
  const id = await db.transaction(async (trx) => {
    await ensureUsersExist(input.member_ids, trx)
    const projectId = await projectRepository.create(
      pickProjectInput(input) as ProjectInput,
      user.id,
      trx,
    )
    await projectMemberRepository.add(projectId, input.member_ids, user.id, trx)
    await boardListRepository.createDefaults(projectId, user.id, trx)
    return projectId
  })
  await notificationService.notifyAddedToProject(id, input.member_ids, user)
  return get(id)
}

// 編集(フェーズの変更を含む)は、管理者(全プロジェクト)と、参画しているリーダーのみ
export const ensureCanEdit = async (id: number, user: AuthUser) => {
  if (!(await projectRepository.findById(id))) throw projectNotFound()
  const allowed =
    user.role === ROLE.ADMIN ||
    (user.role === ROLE.LEADER && (await projectMemberRepository.isMember(id, user.id)))
  if (!allowed) throw forbidden()
}

export const update = async (
  id: number,
  input: Partial<ProjectRequest>,
  user: AuthUser,
): Promise<ProjectDetail> => {
  await ensureCanEdit(id, user)
  // リーダーが自分を外すと編集できなくなるため、外せないようにする
  if (user.role === ROLE.LEADER && input.member_ids && !input.member_ids.includes(user.id)) {
    throw badRequest('自分をプロジェクトメンバーから外すことはできません')
  }

  const added = await db.transaction(async (trx) => {
    const count = await projectRepository.update(id, pickProjectInput(input), user.id, trx)
    if (count === 0) throw projectNotFound()

    if (input.member_ids !== undefined) {
      const current = await projectMemberRepository.findUserIds(id, trx)
      const toAdd = input.member_ids.filter((userId) => !current.includes(userId))
      const toRemove = current.filter((userId) => !input.member_ids!.includes(userId))

      // 未完了のタスクを担当しているユーザーは、担当者を変更するまで外せない
      const busy = await taskRepository.findAssigneeIdsWithStatus(
        id,
        toRemove,
        INCOMPLETE_STATUSES,
        trx,
      )
      if (busy.length > 0) {
        throw conflict('未完了のタスクを担当しているメンバーはプロジェクトから外せません')
      }

      await ensureUsersExist(toAdd, trx)
      await projectMemberRepository.remove(id, toRemove, trx)
      await projectMemberRepository.add(id, toAdd, user.id, trx)
      return toAdd
    }
    return []
  })
  await notificationService.notifyAddedToProject(id, added, user)
  return get(id)
}

export const updatePhase = async (
  id: number,
  phase: ProjectPhase,
  user: AuthUser,
): Promise<ProjectDetail> => {
  await ensureCanEdit(id, user)

  const count = await projectRepository.updatePhase(id, phase, user.id)
  if (count === 0) throw projectNotFound()
  return get(id)
}

export const remove = async (id: number, user: AuthUser): Promise<void> => {
  const count = await projectRepository.softDelete(id, user.id)
  if (count === 0) throw projectNotFound()
}
