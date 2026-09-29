import { db } from '../db/knex'
import type { Tag } from '../types/tag'

// 並び順
export const findAll = (): Promise<Tag[]> =>
  db('tags').select('id', 'name', 'description', 'color', 'text_color').orderBy('position')

// 指定した ID のうち、存在するタグの数
export const countByIds = async (ids: number[]): Promise<number> => {
  if (ids.length === 0) return 0
  const row = await db('tags').whereIn('id', ids).count({ count: '*' }).first()
  return Number(row?.count ?? 0)
}
