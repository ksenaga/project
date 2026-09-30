import type { Request, Response } from 'express'
import * as commentService from '../services/commentService'
import { parseBody, parseId, parseRequiredString } from '../validators/common'

const BODY_MAX_LENGTH = 2000

const params = (req: Request) => ({
  projectId: parseId(req.params.projectId),
  taskId: parseId(req.params.taskId),
  id: req.params.id === undefined ? undefined : parseId(req.params.id),
})

// GET /api/projects/:projectId/tasks/:taskId/comments
export const list = async (req: Request, res: Response) => {
  const { projectId, taskId } = params(req)
  res.json(await commentService.list(projectId, taskId, req.user!))
}

// GET /api/projects/:projectId/tasks/:taskId/comments/mentionable-users
export const mentionable = async (req: Request, res: Response) => {
  const { projectId, taskId } = params(req)
  res.json(await commentService.mentionable(projectId, taskId, req.user!))
}

// POST /api/projects/:projectId/tasks/:taskId/comments
export const create = async (req: Request, res: Response) => {
  const { projectId, taskId } = params(req)
  const body = parseRequiredString(parseBody(req.body).body, BODY_MAX_LENGTH)
  res.status(201).json(await commentService.create(projectId, taskId, body, req.user!))
}

// DELETE /api/projects/:projectId/tasks/:taskId/comments/:id
export const remove = async (req: Request, res: Response) => {
  const { projectId, taskId, id } = params(req)
  await commentService.remove(projectId, taskId, id!, req.user!)
  res.status(204).end()
}
