import * as notificationRepository from '../repositories/notificationRepository'
import * as projectMemberRepository from '../repositories/projectMemberRepository'
import * as projectRepository from '../repositories/projectRepository'
import * as userRepository from '../repositories/userRepository'
import { NOTIFICATION_TYPE, type Notification } from '../types/notification'
import { ROLE, type AuthUser } from '../types/user'

// 通知の一覧で返す件数
const LIST_LIMIT = 30

// 通知は本来の操作(メンバー追加・担当者の変更など)のあとに作る。
// 通知の作成に失敗しても、本来の操作は取り消さない(ログに残す)
const safely = async (task: () => Promise<void>) => {
  try {
    await task()
  } catch (err) {
    console.error('通知の作成に失敗しました', err)
  }
}

const projectName = async (projectId: number) =>
  (await projectRepository.findById(projectId))?.name ?? ''

// 操作した本人には通知しない
const others = (userIds: number[], actor: AuthUser) => [
  ...new Set(userIds.filter((id) => id !== actor.id)),
]

// プロジェクトのメンバーに追加された人へ
export const notifyAddedToProject = (projectId: number, userIds: number[], actor: AuthUser) =>
  safely(async () => {
    const targets = others(userIds, actor)
    if (targets.length === 0) return
    const name = await projectName(projectId)
    await notificationRepository.createMany(
      targets.map((userId) => ({
        user_id: userId,
        type: NOTIFICATION_TYPE.PROJECT_MEMBER,
        project_id: projectId,
        task_id: null,
        actor_id: actor.id,
        message: `${actor.name}さんがあなたをプロジェクト「${name}」のメンバーに追加しました`,
      })),
    )
  })

// タスクの担当者になった人へ
export const notifyAssigned = (
  projectId: number,
  task: { id: number; title: string },
  userIds: number[],
  actor: AuthUser,
) =>
  safely(async () => {
    const targets = others(userIds, actor)
    if (targets.length === 0) return
    const name = await projectName(projectId)
    await notificationRepository.createMany(
      targets.map((userId) => ({
        user_id: userId,
        type: NOTIFICATION_TYPE.TASK_ASSIGNEE,
        project_id: projectId,
        task_id: task.id,
        actor_id: actor.id,
        message: `${actor.name}さんがあなたをタスク「${task.title}」（${name}）の担当者にしました`,
      })),
    )
  })

// 全管理者と、そのプロジェクトの担当リーダー(担当していないリーダーはタスクを開けないので含めない)
const managersOf = async (projectId: number) => {
  const [admins, leaders] = await Promise.all([
    userRepository.findActiveIdsByRole(ROLE.ADMIN),
    projectMemberRepository.findUserIdsByRole(projectId, ROLE.LEADER),
  ])
  return [...admins, ...leaders]
}

// タスクがレビュー中になったら、全管理者と、そのプロジェクトの担当リーダーへ
export const notifyReviewRequested = (
  projectId: number,
  task: { id: number; title: string },
  actor: AuthUser,
) =>
  safely(async () => {
    const targets = others(await managersOf(projectId), actor)
    if (targets.length === 0) return
    const name = await projectName(projectId)
    await notificationRepository.createMany(
      targets.map((userId) => ({
        user_id: userId,
        type: NOTIFICATION_TYPE.TASK_REVIEW,
        project_id: projectId,
        task_id: task.id,
        actor_id: actor.id,
        message: `${actor.name}さんがタスク「${task.title}」（${name}）をレビュー中にしました`,
      })),
    )
  })

// 通知の文章は 255 文字まで。理由が長いときは省略する
const MESSAGE_MAX_LENGTH = 255
const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`

// 一般ユーザーからの中止依頼を、全管理者と、そのプロジェクトの担当リーダーへ。
// こちらは依頼が届いたことが大事なので、失敗したらエラーにする(safely を使わない)
export const notifyCancelRequested = async (
  projectId: number,
  task: { id: number; title: string },
  reason: string | null,
  actor: AuthUser,
): Promise<number> => {
  const targets = others(await managersOf(projectId), actor)
  const name = await projectName(projectId)
  const base = `${actor.name}さんがタスク「${task.title}」（${name}）の中止を依頼しました`
  const message = reason
    ? truncate(`${base}。理由: ${reason}`, MESSAGE_MAX_LENGTH)
    : truncate(base, MESSAGE_MAX_LENGTH)
  await notificationRepository.createMany(
    targets.map((userId) => ({
      user_id: userId,
      type: NOTIFICATION_TYPE.TASK_CANCEL_REQUEST,
      project_id: projectId,
      task_id: task.id,
      actor_id: actor.id,
      message,
    })),
  )
  return targets.length
}

// 通知の文面は短く「コメントが届いています。」「メンションされました。」だけにする
// (コメントの内容は通知を開いた先のタスクで見る)
const COMMENT_MESSAGE = 'コメントが届いています。'
const MENTION_MESSAGE = 'メンションされました。'

// 担当しているタスクにコメントが付いたら、担当者へ(書いた本人は除く)。
// exclude の人(メンションされて、別に通知を受け取る人)には送らない
export const notifyCommented = (
  projectId: number,
  task: { id: number; assignees: { id: number }[] },
  actor: AuthUser,
  exclude: number[] = [],
) =>
  safely(async () => {
    const targets = others(
      task.assignees.map((assignee) => assignee.id),
      actor,
    ).filter((id) => !exclude.includes(id))
    if (targets.length === 0) return
    await notificationRepository.createMany(
      targets.map((userId) => ({
        user_id: userId,
        type: NOTIFICATION_TYPE.TASK_COMMENT,
        project_id: projectId,
        task_id: task.id,
        actor_id: actor.id,
        message: COMMENT_MESSAGE,
      })),
    )
  })

// コメントでメンションされた人へ(書いた本人は除く)
export const notifyMentioned = (
  projectId: number,
  task: { id: number },
  userIds: number[],
  actor: AuthUser,
) =>
  safely(async () => {
    const targets = others(userIds, actor)
    if (targets.length === 0) return
    await notificationRepository.createMany(
      targets.map((userId) => ({
        user_id: userId,
        type: NOTIFICATION_TYPE.TASK_MENTION,
        project_id: projectId,
        task_id: task.id,
        actor_id: actor.id,
        message: MENTION_MESSAGE,
      })),
    )
  })

// 担当しているタスクの期限が迫ったとき(期限の色が黄色・赤になったとき)、担当者へ
export const notifyDeadlineApproaching = (
  projectId: number,
  task: { id: number; deadline: string },
  userIds: number[],
) =>
  safely(async () => {
    if (userIds.length === 0) return
    await notificationRepository.createMany(
      userIds.map((userId) => ({
        user_id: userId,
        type: NOTIFICATION_TYPE.TASK_DEADLINE,
        project_id: projectId,
        task_id: task.id,
        actor_id: null,
        message: `期限が${task.deadline.replaceAll('-', '/')}に迫っています。`,
      })),
    )
  })

// ログイン中のユーザーの通知(新しい順)と未読の件数
export const list = async (
  user: AuthUser,
): Promise<{ notifications: Notification[]; unread_count: number }> => {
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.findByUser(user.id, LIST_LIMIT),
    notificationRepository.countUnread(user.id),
  ])
  return { notifications, unread_count: unreadCount }
}

// 自分の通知以外は既読にできない(存在しない通知と同じく何もしない)
export const markRead = async (id: number, user: AuthUser): Promise<void> => {
  await notificationRepository.markRead(user.id, id)
}

export const markAllRead = (user: AuthUser) => notificationRepository.markAllRead(user.id)
