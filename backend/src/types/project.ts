// projects テーブルの行
export type ProjectRow = {
  id: number
  name: string
  detail: string
  deadline: Date
  creater: number
  created_at: Date
  updater: number | null
  updated_at: Date | null
  deleted_at: Date | null
}

export type Member = {
  id: number
  name: string
  // アイコン画像の URL(画像がなければ null)。画像を変えると URL も変わる
  avatar_url: string | null
}

// プロジェクトのフェーズ(プルダウンの並び順)
export const PROJECT_PHASES = [
  '企画',
  '要件定義',
  '設計',
  '開発',
  'テスト',
  'リリース',
  '保守',
  '終了',
] as const
export type ProjectPhase = (typeof PROJECT_PHASES)[number]

// 進捗度 = done / total
// total は未対応・対応中・レビュー中・完了のタスク数(対応中止は含まない)、done は完了のタスク数
export type ProjectProgress = {
  done: number
  total: number
}

// DB から取得したプロジェクト(deadline は "YYYY-MM-DD")
export type ProjectBase = {
  id: number
  name: string
  detail: string
  deadline: string
  phase: ProjectPhase
  progress: ProjectProgress
}

// API で返すプロジェクト
export type Project = ProjectBase & {
  members: Member[]
}

export type ProjectDetail = Project & {
  creater: Member
}

// projects テーブルに書き込む値
export type ProjectInput = Pick<ProjectBase, 'name' | 'detail' | 'deadline'>

// 作成・編集で受け取る値(member_ids はプロジェクトメンバーの user_id)
export type ProjectRequest = ProjectInput & {
  member_ids: number[]
}
