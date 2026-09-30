import type { Member } from './project'

export const COMMENT_TYPE = {
  COMMENT: 'comment', // 人が書いたコメント
  MOVE: 'move', // タスクを移動したときの自動コメント(ログの代わり。削除できない)
} as const

export type CommentType = (typeof COMMENT_TYPE)[keyof typeof COMMENT_TYPE]

export type Comment = {
  id: number
  type: CommentType
  body: string
  user: Member // 書いた人(自動コメントは操作した人)
  created_at: string // ISO 8601
}
