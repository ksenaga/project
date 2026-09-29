import type { Request, Response } from 'express'
import { badRequest } from '../errors/HttpError'
import * as userService from '../services/userService'
import { ROLES, type Role, type UserInput } from '../types/user'
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
  res.json({ users: await userService.list() })
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

// DELETE /api/users/:id
export const remove = async (req: Request, res: Response) => {
  await userService.remove(parseId(req.params.id), req.user!)
  res.status(204).end()
}
