import type { Member } from './project'

export const PROJECT_LOG_TYPE = {
  CREATE: 'create', // プロジェクトを作成した
  CHANGE: 'change', // 名前・詳細・期限・メンバーを変更した
  PHASE: 'phase', // フェーズを変更した
} as const

export type ProjectLogType = (typeof PROJECT_LOG_TYPE)[keyof typeof PROJECT_LOG_TYPE]

export type ProjectLog = {
  id: number
  type: ProjectLogType
  body: string
  user: Member // 操作した人
  created_at: string // ISO 8601
}
