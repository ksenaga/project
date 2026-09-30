import type { Member } from './project'
import type { ScreenRef } from './screen'
import type { TagRef } from './tag'

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

// 期限の色を付けないステータス(色での絞り込みの対象外)
export const CLOSED_STATUSES: readonly TaskStatus[] = [TASK_STATUS.DONE, TASK_STATUS.CANCELED]

// 期限の色。今日から期限までの日数で決める
//   red: 7日以内(期限切れを含む) / yellow: 8〜14日 / green(緑): 15日以上
export const DEADLINE_COLORS = ['red', 'yellow', 'green'] as const
export type DeadlineColor = (typeof DEADLINE_COLORS)[number]
export const DEADLINE_RED_MAX_DAYS = 7
export const DEADLINE_YELLOW_MAX_DAYS = 14

// 追加したリストに入っているタスクの status(未完了として扱うため「対応中」にする)
export const CUSTOM_LIST_STATUS: TaskStatus = TASK_STATUS.DOING

// 一般ユーザーが編集できる項目(list_id は追加したリストへの移動)
export const MEMBER_EDITABLE_FIELDS = [
  'status',
  'list_id',
  'modified',
  'reason',
  'git',
  'memo',
] as const

// 一覧で返すタスク
export type TaskSummary = {
  id: number
  title: string
  status: TaskStatus
  deadline: string // "YYYY-MM-DD"
  assignees: Member[] // 担当者(1人以上。ID 順)
  tags: TagRef[] // タグ(タグの並び順)
  screen: ScreenRef | null
  list_id: number | null // 追加したリストに入っているときのリスト。既存の5つのときは null
  comment_count: number // 人が書いたコメントの数(移動の自動コメントは数えない)
}

// 詳細で返すタスク
export type Task = TaskSummary & {
  // 最後に更新した日時(ISO 8601。一度も更新していなければ null)。同時編集の確認に使う
  updated_at: string | null
  detail: string
  modified: string | null
  reason: string | null
  git: string | null
  memo: string | null
}

// 作成・編集で受け取る値(user_ids は担当者。1人以上)
export type TaskInput = {
  title: string
  detail: string
  user_ids: number[]
  tag_ids: number[] // タグ(0個以上)
  status: TaskStatus
  deadline: string
  screen_id: number // 必須(以前のタスクは画面名なし(NULL)の場合がある)
  // 追加したリストへ移動するときに指定する(status と同時には指定できない)。status を指定すると null になる
  list_id: number | null
  modified: string | null
  reason: string | null
  git: string | null
  memo: string | null
}

// tasks テーブルに書き込む値(担当者は task_assignees に書き込む)
// (担当者は task_assignees、タグは task_tags に書き込む)
export type TaskFields = Omit<TaskInput, 'user_ids' | 'tag_ids'>

// 一覧の絞り込み条件(指定したものすべてに当てはまるタスクを返す)
export type TaskFilter = {
  // タイトル・説明・修正内容・修正理由・メモに含まれる文字
  q?: string
  assigneeId?: number
  // null は「画面名が未設定」
  screenId?: number | null
  // 期限の範囲("YYYY-MM-DD"。どちらか片方だけでもよい)
  deadlineFrom?: string
  deadlineTo?: string
  // 期限の色(完了・対応中止のタスクは含まない)
  deadlineColor?: DeadlineColor
}
