import type { TaskSummary } from '../api/tasks'
import { ROLE } from '../constants/role'
import {
  MEMBER_SETTABLE_STATUSES,
  TASK_STATUS,
  TASK_STATUSES,
  type TaskStatus,
} from '../constants/taskStatus'
import type { LoginUser } from '../pages/LoginPage'

// サーバー側のルールと同じ判定。ボタンの表示やドラッグの可否に使う

// 完了したタスクは誰も編集できない。一般ユーザーは自分が担当するタスクだけ
export const canEditTask = (user: LoginUser, task: TaskSummary) =>
  task.status !== TASK_STATUS.DONE && (user.role !== ROLE.MEMBER || task.assignee.id === user.id)

// 一般ユーザーは「編集できる項目」が限られる
export const isLimitedEditor = (user: LoginUser) => user.role === ROLE.MEMBER

export const settableStatuses = (user: LoginUser): readonly TaskStatus[] =>
  user.role === ROLE.MEMBER ? MEMBER_SETTABLE_STATUSES : TASK_STATUSES

export const canMoveTask = (user: LoginUser, task: TaskSummary, status: TaskStatus) =>
  canEditTask(user, task) && settableStatuses(user).includes(status)

export const canDeleteTask = (user: LoginUser) => user.role !== ROLE.MEMBER
