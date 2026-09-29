import type { Member } from './project'

export const TASK_STATUS = {
  TODO: '未対応',
  DOING: '対応中',
  REVIEW: 'レビュー中',
  DONE: '完了',
  CANCELED: '対応中止',
} as const

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

export const TASK_STATUSES: readonly TaskStatus[] = Object.values(TASK_STATUS)

// 未完了のステータス(このタスクの担当者はプロジェクトから外せない)
export const INCOMPLETE_STATUSES: readonly TaskStatus[] = [
  TASK_STATUS.TODO,
  TASK_STATUS.DOING,
  TASK_STATUS.REVIEW,
]

// 新規作成できるステータス(全ロール共通)
export const CREATABLE_STATUSES: readonly TaskStatus[] = [TASK_STATUS.TODO, TASK_STATUS.DOING]

// 一般ユーザーが設定できるステータス(完了・対応中止は管理者・リーダーのみ)
export const MEMBER_SETTABLE_STATUSES: readonly TaskStatus[] = [
  TASK_STATUS.TODO,
  TASK_STATUS.DOING,
  TASK_STATUS.REVIEW,
]

// 一般ユーザーが編集できる項目
export const MEMBER_EDITABLE_FIELDS = ['status', 'modified', 'reason', 'git', 'memo'] as const

// 一覧で返すタスク
export type TaskSummary = {
  id: number
  title: string
  status: TaskStatus
  deadline: string // "YYYY-MM-DD"
  assignee: Member
}

// 詳細で返すタスク
export type Task = TaskSummary & {
  detail: string
  screen: string | null
  modified: string | null
  reason: string | null
  git: string | null
  memo: string | null
}

// 作成・編集で受け取る値(user_id は担当者)
export type TaskInput = {
  title: string
  detail: string
  user_id: number
  status: TaskStatus
  deadline: string
  screen: string | null
  modified: string | null
  reason: string | null
  git: string | null
  memo: string | null
}
