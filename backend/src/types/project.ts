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
}

// DB から取得したプロジェクト(deadline は "YYYY-MM-DD")
export type ProjectBase = {
  id: number
  name: string
  detail: string
  deadline: string
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
