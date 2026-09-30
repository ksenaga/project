export const NOTIFICATION_TYPE = {
  PROJECT_MEMBER: 'project_member', // プロジェクトのメンバーに追加された
  TASK_ASSIGNEE: 'task_assignee', // タスクの担当者になった
  TASK_REVIEW: 'task_review', // タスクがレビュー中になった(管理者・担当リーダーへ)
  TASK_CANCEL_REQUEST: 'task_cancel_request', // 一般ユーザーからの中止依頼(管理者・担当リーダーへ)
  TASK_COMMENT: 'task_comment', // 担当しているタスクにコメントが付いた(担当者へ)
} as const

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]

export type Notification = {
  id: number
  type: NotificationType
  project_id: number
  task_id: number | null
  message: string
  read: boolean
  created_at: string // ISO 8601
}
