// 画面名(プロジェクトごとに管理する)
export type ScreenRef = {
  id: number
  name: string
  color: string // 画面名の色(#RRGGBB。明るい色)
}

// 一覧で返す画面名(使っているタスク数付き)
export type Screen = ScreenRef & {
  task_count: number
}
