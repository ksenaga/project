import { app } from './app'
import { env } from './config/env'
import { startDeadlineAlerts } from './services/deadlineAlertService'

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`)
  // 期限の色が変わったタスクの担当者に通知する
  startDeadlineAlerts()
})
