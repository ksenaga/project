import type { Request, Response } from 'express'
import * as screenService from '../services/screenService'
import { badRequest } from '../errors/HttpError'
import { parseBody, parseColor, parseId, parseRequiredString } from '../validators/common'

const NAME_MAX_LENGTH = 50

const parseName = (body: unknown) => parseRequiredString(parseBody(body).name, NAME_MAX_LENGTH)

const params = (req: Request) => ({
  projectId: parseId(req.params.projectId),
  id: req.params.id === undefined ? undefined : parseId(req.params.id),
})

// GET /api/projects/:projectId/screens
export const list = async (req: Request, res: Response) => {
  const { projectId } = params(req)
  res.json(await screenService.list(projectId, req.user!))
}

// POST /api/projects/:projectId/screens(色は省略するとグレー)
export const create = async (req: Request, res: Response) => {
  const { projectId } = params(req)
  const { color } = parseBody(req.body)
  const input = {
    name: parseName(req.body),
    ...(color !== undefined && { color: parseColor(color) }),
  }
  res.status(201).json(await screenService.create(projectId, input, req.user!))
}

// PATCH /api/projects/:projectId/screens/:id(名前・色の変更。送った項目だけ変更する)
export const update = async (req: Request, res: Response) => {
  const { projectId, id } = params(req)
  const { name, color } = parseBody(req.body)
  const fields: { name?: string; color?: string } = {}
  if (name !== undefined) fields.name = parseName(req.body)
  if (color !== undefined) fields.color = parseColor(color)
  if (Object.keys(fields).length === 0) throw badRequest()
  res.json(await screenService.update(projectId, id!, fields, req.user!))
}

// DELETE /api/projects/:projectId/screens/:id
export const remove = async (req: Request, res: Response) => {
  const { projectId, id } = params(req)
  await screenService.remove(projectId, id!, req.user!)
  res.status(204).end()
}
