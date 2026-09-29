export const TASK_STATUS = {
  TODO: '未対応',
  DOING: '対応中',
  REVIEW: 'レビュー中',
  DONE: '完了',
  CANCELED: '対応中止',
} as const

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

// ボードの列の並び
export const TASK_STATUSES: readonly TaskStatus[] = Object.values(TASK_STATUS)

// 列の見出しに付ける色
export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  未対応: '#94a3b8',
  対応中: '#3b82f6',
  レビュー中: '#f59e0b',
  完了: '#22c55e',
  対応中止: '#ef4444',
}

// 新規作成できるステータス(全ロール共通)
export const CREATABLE_STATUSES: readonly TaskStatus[] = [TASK_STATUS.TODO, TASK_STATUS.DOING]

// 一般ユーザーが設定できるステータス(完了・対応中止は管理者・リーダーのみ)
export const MEMBER_SETTABLE_STATUSES: readonly TaskStatus[] = [
  TASK_STATUS.TODO,
  TASK_STATUS.DOING,
  TASK_STATUS.REVIEW,
]

// 期限切れの表示をしないステータス
export const CLOSED_STATUSES: readonly TaskStatus[] = [TASK_STATUS.DONE, TASK_STATUS.CANCELED]
