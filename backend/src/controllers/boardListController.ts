import type { Request, Response } from 'express'
import { badRequest } from '../errors/HttpError'
import * as boardListService from '../services/boardListService'
import { parseBody, parseId, parseIdArray, parseRequiredString } from '../validators/common'

const NAME_MAX_LENGTH = 50

const parseName = (body: unknown) => parseRequiredString(parseBody(body).name, NAME_MAX_LENGTH)

// 背景色は #RRGGBB(同じ色のリストがあってもよい)
const parseColor = (value: unknown): string => {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) throw badRequest()
  return value.toLowerCase()
}

const params = (req: Request) => ({
  projectId: parseId(req.params.projectId),
  id: req.params.id === undefined ? undefined : parseId(req.params.id),
})

// GET /api/projects/:projectId/lists
export const list = async (req: Request, res: Response) => {
  const { projectId } = params(req)
  res.json(await boardListService.list(projectId, req.user!))
}

// POST /api/projects/:projectId/lists
export const create = async (req: Request, res: Response) => {
  const { projectId } = params(req)
  const { color } = parseBody(req.body)
  const input = {
    name: parseName(req.body),
    color: color === undefined ? undefined : parseColor(color),
  }
  res.status(201).json(await boardListService.create(projectId, input, req.user!))
}

// PATCH /api/projects/:projectId/lists/:id(名前・色の変更。送った項目だけ変更する)
export const update = async (req: Request, res: Response) => {
  const { projectId, id } = params(req)
  const { name, color } = parseBody(req.body)
  const fields: { name?: string; color?: string } = {}
  if (name !== undefined) fields.name = parseName(req.body)
  if (color !== undefined) fields.color = parseColor(color)
  if (Object.keys(fields).length === 0) throw badRequest()
  res.json(await boardListService.update(projectId, id!, fields, req.user!))
}

// PUT /api/projects/:projectId/lists/order
export const reorder = async (req: Request, res: Response) => {
  const { projectId } = params(req)
  const ids = parseIdArray(parseBody(req.body).list_ids)
  res.json(await boardListService.reorder(projectId, ids, req.user!))
}

// DELETE /api/projects/:projectId/lists/:id
export const remove = async (req: Request, res: Response) => {
  const { projectId, id } = params(req)
  await boardListService.remove(projectId, id!, req.user!)
  res.status(204).end()
}
