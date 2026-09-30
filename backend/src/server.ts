import { app } from './app'
import { env } from './config/env'
import { startDeadlineAlerts } from './services/deadlineAlertService'
import * as taskImageService from './services/taskImageService'

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`)
  // 期限の色が変わったタスクの担当者に通知する
  startDeadlineAlerts()
  // 修正内容に貼ったまま保存しなかった画像を削除する
  taskImageService.startCleanup()
})
