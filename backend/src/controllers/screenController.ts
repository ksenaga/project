import type { Request, Response } from 'express'
import * as screenService from '../services/screenService'
import { parseBody, parseId, parseRequiredString } from '../validators/common'

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

// POST /api/projects/:projectId/screens
export const create = async (req: Request, res: Response) => {
  const { projectId } = params(req)
  res.status(201).json(await screenService.create(projectId, parseName(req.body), req.user!))
}

// PATCH /api/projects/:projectId/screens/:id
export const update = async (req: Request, res: Response) => {
  const { projectId, id } = params(req)
  res.json(await screenService.update(projectId, id!, parseName(req.body), req.user!))
}

// DELETE /api/projects/:projectId/screens/:id
export const remove = async (req: Request, res: Response) => {
  const { projectId, id } = params(req)
  await screenService.remove(projectId, id!, req.user!)
  res.status(204).end()
}
