import { badRequest } from '../errors/HttpError'

// controller で使う入力チェック。不正なら 400 を投げる

export const parseId = (value: unknown): number => {
  const id = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) throw badRequest()
  return id
}

export const parseBody = (body: unknown): Record<string, unknown> => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw badRequest()
  return body as Record<string, unknown>
}

// 必須の文字列(前後の空白は除く)
export const parseRequiredString = (value: unknown, maxLength?: number): string => {
  if (typeof value !== 'string') throw badRequest()
  const trimmed = value.trim()
  if (trimmed === '' || (maxLength !== undefined && trimmed.length > maxLength)) throw badRequest()
  return trimmed
}

// 任意の文字列。未入力(null / 空文字)は null にする
export const parseOptionalString = (value: unknown, maxLength?: number): string | null => {
  if (value === null) return null
  if (typeof value !== 'string') throw badRequest()
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (maxLength !== undefined && trimmed.length > maxLength) throw badRequest()
  return trimmed
}

// "YYYY-MM-DD" で、実在する日付
export const parseDate = (value: unknown): string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest()
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || !date.toISOString().startsWith(value)) throw badRequest()
  return value
}

// ID の配列(重複は除く)
export const parseIdArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) throw badRequest()
  return [...new Set(value.map(parseId))]
}

export const parseEnum = <T extends string>(value: unknown, allowed: readonly T[]): T => {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw badRequest()
  return value as T
}
