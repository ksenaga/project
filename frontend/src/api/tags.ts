import { request } from './client'

// タスクに付けるタグ(バグ・修正・要望・改善・新規・調査・問い合わせ・緊急)
export type Tag = {
  id: number
  name: string
  description: string // タグの意味
  color: string // 背景色
  text_color: string // 文字色
}

export type TagRef = Pick<Tag, 'id' | 'name' | 'color' | 'text_color'>

// 並び順
export const fetchTags = () => request<Tag[]>('/tags')
