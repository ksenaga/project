import type { TaskSummary } from '../api/tasks'
import { daysUntil } from '../utils/date'
import { CLOSED_STATUSES } from './taskStatus'

// 期限の色。今日から期限までの日数で決める(サーバーの絞り込みと同じ基準)
export const DEADLINE_RED_MAX_DAYS = 7
export const DEADLINE_YELLOW_MAX_DAYS = 14

export type DeadlineColor = 'red' | 'yellow' | 'green'

export const DEADLINE_COLOR_STYLE: Record<
  DeadlineColor,
  { label: string; description: string; bg: string; text: string }
> = {
  red: {
    label: '赤',
    description: `${DEADLINE_RED_MAX_DAYS}日以内`,
    bg: '#dc2626',
    text: '#ffffff',
  },
  yellow: {
    label: '黄色',
    description: `${DEADLINE_RED_MAX_DAYS + 1}〜${DEADLINE_YELLOW_MAX_DAYS}日`,
    bg: '#facc15',
    text: '#422006',
  },
  green: {
    label: '黄緑',
    description: `${DEADLINE_YELLOW_MAX_DAYS + 1}日以上`,
    bg: '#a3e635',
    text: '#1a2e05',
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
