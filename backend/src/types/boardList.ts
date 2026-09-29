import { TASK_STATUS, type TaskStatus } from './task'

// 既存の5つのリストの背景色(ステータスの色を明るくしたもの)
export const FIXED_LIST_COLORS: Record<TaskStatus, string> = {
  [TASK_STATUS.TODO]: '#e2e8f0',
  [TASK_STATUS.DOING]: '#dbeafe',
  [TASK_STATUS.REVIEW]: '#fef3c7',
  [TASK_STATUS.DONE]: '#dcfce7',
  [TASK_STATUS.CANCELED]: '#fee2e2',
}

// 追加したリストで色を指定しなかったときの色
export const DEFAULT_LIST_COLOR = '#f1f5f9'

// ボードのリスト。status があるのは既存の5つ(名前の変更・削除はできない)、null は追加したリスト
export type BoardList = {
  id: number
  name: string
  status: TaskStatus | null
  position: number
  color: string // 背景色(#RRGGBB)
  task_count: number // 入っている(削除されていない)タスク数
}
