import type { Request, Response } from 'express'
import { badRequest } from '../errors/HttpError'
import * as userService from '../services/userService'
import {
  AVATAR_CONTENT_TYPES,
  ROLES,
  type AvatarContentType,
  type Role,
  type UserInput,
} from '../types/user'
import { parseBody, parseId, parseRequiredString } from '../validators/common'

const NAME_MAX_LENGTH = 50
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 72 // bcrypt が扱える上限

const parsePassword = (value: unknown): string => {
  if (typeof value !== 'string') throw badRequest()
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    throw badRequest(
      `パスワードは${PASSWORD_MIN_LENGTH}〜${PASSWORD_MAX_LENGTH}文字で入力してください`,
    )
  }
  return value
}

const parseRole = (value: unknown): Role => {
  const role = Number(value)
  if (!ROLES.includes(role as Role)) throw badRequest()
  return role as Role
}

// partial: true のときは送られてきた項目だけチェックする(PATCH 用)。
// PATCH で password が空文字・未指定なら変更しない
const parseUserInput = (body: unknown, { partial }: { partial: boolean }) => {
  const { name, password, role } = parseBody(body)
  const input: Partial<UserInput> = {}

  if (name !== undefined || !partial) input.name = parseRequiredString(name, NAME_MAX_LENGTH)
  if (!partial || (password !== undefined && password !== ''))
    input.password = parsePassword(password)
  if (role !== undefined || !partial) input.role = parseRole(role)

  if (Object.keys(input).length === 0) throw badRequest()
  return input
}

// GET /api/users
export const list = async (req: Request, res: Response) => {
  res.json({ users: await userService.list(req.user!) })
}

// GET /api/users/:id
export const get = async (req: Request, res: Response) => {
  res.json(await userService.get(parseId(req.params.id)))
}

// POST /api/users
export const create = async (req: Request, res: Response) => {
  const input = parseUserInput(req.body, { partial: false }) as UserInput
  res.status(201).json(await userService.create(input, req.user!))
}

// PATCH /api/users/:id
export const update = async (req: Request, res: Response) => {
  const id = parseId(req.params.id)
  const input = parseUserInput(req.body, { partial: true })
  res.json(await userService.update(id, input, req.user!))
}

// POST /api/users/:id/unlock
export const unlock = async (req: Request, res: Response) => {
  res.json(await userService.unlock(parseId(req.params.id), req.user!))
}

// 画像の先頭のバイト列(ファイルの形式を表す)。Content-Type と中身が合っているかを確かめる
const MAGIC_BYTES: Record<AvatarContentType, (data: Buffer) => boolean> = {
  'image/png': (data) =>
    data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (data) => data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/webp': (data) =>
    data.subarray(0, 4).toString('latin1') === 'RIFF' &&
    data.subarray(8, 12).toString('latin1') === 'WEBP',
}

// GET /api/users/:id/avatar
// URL に設定した日時(?v=)が付いているので、同じ URL の画像は変わらない。長くキャッシュしてよい
export const getAvatar = async (req: Request, res: Response) => {
  const avatar = await userService.getAvatar(parseId(req.params.id))
  res
    .set('Content-Type', avatar.content_type)
    .set('Cache-Control', 'private, max-age=31536000, immutable')
    .set('X-Content-Type-Options', 'nosniff')
    .send(avatar.data)
}

// PUT /api/users/:id/avatar(本文は画像のデータそのもの。Content-Type で形式を指定する)
export const saveAvatar = async (req: Request, res: Response) => {
  const id = parseId(req.params.id)
  const contentType = req.get('Content-Type')?.split(';')[0].trim().toLowerCase()
  const data: unknown = req.body
  if (
    !AVATAR_CONTENT_TYPES.includes(contentType as AvatarContentType) ||
    !Buffer.isBuffer(data) ||
    data.length === 0 ||
    !MAGIC_BYTES[contentType as AvatarContentType](data)
  ) {
    throw badRequest('画像は PNG・JPEG・WebP のいずれかにしてください')
  }
  res.json(await userService.saveAvatar(id, contentType as AvatarContentType, data, req.user!))
}

// DELETE /api/users/:id/avatar
export const removeAvatar = async (req: Request, res: Response) => {
  res.json(await userService.removeAvatar(parseId(req.params.id), req.user!))
}

// DELETE /api/users/:id
export const remove = async (req: Request, res: Response) => {
  await userService.remove(parseId(req.params.id), req.user!)
  res.status(204).end()
}
