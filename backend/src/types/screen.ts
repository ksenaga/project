// 画面名(プロジェクトごとに管理する)
export type ScreenRef = {
  id: number
  name: string
}

// 一覧で返す画面名(使っているタスク数付き)
export type Screen = ScreenRef & {
  task_count: number
}
