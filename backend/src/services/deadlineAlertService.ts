import * as taskRepository from '../repositories/taskRepository'
import * as notificationService from './notificationService'

// 期限の色が変わったか確かめる間隔。色は日付が変わると変わるので、0時を過ぎたら早めに気づけるようにする
const CHECK_INTERVAL_MS = 10 * 60 * 1000

// 期限の色が進んだ(緑 → 黄色、黄色 → 赤)未完了のタスクの担当者に通知する。
// 知らせた色を先に上げ、上げられたタスクだけ通知する(サーバーが複数あっても、同じ通知は1回だけ)
export const checkDeadlines = async (): Promise<number> => {
  let notified = 0
  for (const task of await taskRepository.findDeadlineAlertTargets()) {
    if (!(await taskRepository.raiseDeadlineAlertLevel(task.id, task.level))) continue
    const assigneeIds = await taskRepository.findActiveAssigneeIds(task.id)
    await notificationService.notifyDeadlineApproaching(task.project_id, task, assigneeIds)
    notified += 1
  }
  return notified
}

const checkSafely = () =>
  checkDeadlines().catch((err: unknown) => console.error('期限の確認に失敗しました', err))

// サーバーの起動時に1回と、その後は一定の間隔で確かめる
export const startDeadlineAlerts = () => {
  void checkSafely()
  setInterval(checkSafely, CHECK_INTERVAL_MS).unref()
}
