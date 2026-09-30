import { db, type Conn } from '../db/knex'
import { badRequest, conflict, forbidden, notFound } from '../errors/HttpError'
import * as boardListRepository from '../repositories/boardListRepository'
import * as projectLogRepository from '../repositories/projectLogRepository'
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
import { PROJECT_LOG_TYPE, type ProjectLog } from '../types/projectLog'
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
      .map(({ project_id: _projectId, ...member }) => member),
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

// 変更履歴は、変更した項目を1行ずつ「・」を付けて書く(誰が変えたかは user_id で持つ)
const logLines = (lines: string[]) => lines.map((line) => `・${line}`).join('\n')
const formatDeadline = (deadline: string) => deadline.replaceAll('-', '/')
const joinNames = (names: string[]) => names.join('、')

// 名前・詳細・期限の変更を文章にする(詳細は長いので、変えたことだけを書く)
const describeChanges = (before: ProjectBase, input: Partial<ProjectInput>): string[] => {
  const changes: string[] = []
  if (input.name !== undefined && input.name !== before.name) {
    changes.push(`名前: 「${before.name}」 → 「${input.name}」`)
  }
  if (input.detail !== undefined && input.detail !== before.detail) changes.push('詳細を変更')
  if (input.deadline !== undefined && input.deadline !== before.deadline) {
    changes.push(`期限: ${formatDeadline(before.deadline)} → ${formatDeadline(input.deadline)}`)
  }
  return changes
}

// 変更履歴(新しい順)。プロジェクト一覧・メンバーと同じく、全ロールが見られる
export const logs = async (id: number): Promise<ProjectLog[]> => {
  if (!(await projectRepository.findById(id))) throw projectNotFound()
  return projectLogRepository.findByProject(id)
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
    const memberNames = await userRepository.findNamesByIds(input.member_ids, trx)
    await projectLogRepository.create(
      projectId,
      user.id,
      PROJECT_LOG_TYPE.CREATE,
      [
        'プロジェクトを作成しました',
        logLines([`メンバー: ${memberNames.length > 0 ? joinNames(memberNames) : 'なし'}`]),
      ].join('\n'),
      trx,
    )
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
    const before = await projectRepository.findById(id, trx)
    if (!before) throw projectNotFound()
    const fields = pickProjectInput(input)
    const count = await projectRepository.update(id, fields, user.id, trx)
    if (count === 0) throw projectNotFound()
    // 変更履歴に書く内容(変わった項目だけ)
    const changes = describeChanges(before, fields)
    const writeLog = async () => {
      if (changes.length === 0) return
      await projectLogRepository.create(
        id,
        user.id,
        PROJECT_LOG_TYPE.CHANGE,
        logLines(changes),
        trx,
      )
    }

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
      if (toAdd.length > 0) {
        changes.push(
          `メンバーに追加: ${joinNames(await userRepository.findNamesByIds(toAdd, trx))}`,
        )
      }
      if (toRemove.length > 0) {
        changes.push(
          `メンバーから外す: ${joinNames(await userRepository.findNamesByIds(toRemove, trx))}`,
        )
      }
      await writeLog()
      return toAdd
    }
    await writeLog()
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

  await db.transaction(async (trx) => {
    const before = await projectRepository.findById(id, trx)
    if (!before) throw projectNotFound()
    const count = await projectRepository.updatePhase(id, phase, user.id, trx)
    if (count === 0) throw projectNotFound()
    if (before.phase !== phase) {
      await projectLogRepository.create(
        id,
        user.id,
        PROJECT_LOG_TYPE.PHASE,
        logLines([`フェーズ: ${before.phase} → ${phase}`]),
        trx,
      )
    }
  })
  return get(id)
}

export const remove = async (id: number, user: AuthUser): Promise<void> => {
  const count = await projectRepository.softDelete(id, user.id)
  if (count === 0) throw projectNotFound()
}
