import type { TaskSummary } from '../api/tasks'
import { daysUntil } from '../utils/date'
import { CLOSED_STATUSES } from './taskStatus'

// 期限の色。今日から期限までの日数で決める(サーバーの絞り込みと同じ基準)
export const DEADLINE_RED_MAX_DAYS = 7
export const DEADLINE_YELLOW_MAX_DAYS = 14

export type DeadlineColor = 'red' | 'yellow' | 'green'

// bg・text は期限の表示(ステータスと同じくらいの薄い背景に、同じ系統の濃い文字)。
// dot は絞り込みの選択肢に付ける小さな丸(小さいので、見分けやすい濃い色にする)
export const DEADLINE_COLOR_STYLE: Record<
  DeadlineColor,
  { label: string; description: string; bg: string; text: string; dot: string }
> = {
  red: {
    label: '赤',
    description: `${DEADLINE_RED_MAX_DAYS}日以内`,
    bg: '#fee2e2',
    text: '#b91c1c',
    dot: '#dc2626',
  },
  yellow: {
    label: '黄色',
    description: `${DEADLINE_RED_MAX_DAYS + 1}〜${DEADLINE_YELLOW_MAX_DAYS}日`,
    bg: '#fef9c3',
    text: '#854d0e',
    dot: '#facc15',
  },
  green: {
    label: '緑',
    description: `${DEADLINE_YELLOW_MAX_DAYS + 1}日以上`,
    bg: '#dcfce7',
    text: '#15803d',
    dot: '#22c55e',
  },
}

export const DEADLINE_COLORS = Object.keys(DEADLINE_COLOR_STYLE) as DeadlineColor[]

// 完了・対応中止のタスクは色を付けない(null)
export const deadlineColorOf = (task: Pick<TaskSummary, 'status' | 'deadline'>) => {
  if (CLOSED_STATUSES.includes(task.status)) return null
  const days = daysUntil(task.deadline)
  if (days <= DEADLINE_RED_MAX_DAYS) return 'red'
  if (days <= DEADLINE_YELLOW_MAX_DAYS) return 'yellow'
  return 'green'
}
