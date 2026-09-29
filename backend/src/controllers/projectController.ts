import type { Request, Response } from 'express'
import { badRequest } from '../errors/HttpError'
import * as projectService from '../services/projectService'
import type { ProjectRequest } from '../types/project'
import {
  parseBody,
  parseDate,
  parseId,
  parseIdArray,
  parseRequiredString,
} from '../validators/common'

const NAME_MAX_LENGTH = 50

// partial: true のときは送られてきた項目だけチェックする(PATCH 用)
const parseProjectRequest = (body: unknown, { partial }: { partial: boolean }) => {
  const { name, detail, deadline, member_ids } = parseBody(body)
  const input: Partial<ProjectRequest> = {}

  if (name !== undefined || !partial) input.name = parseRequiredString(name, NAME_MAX_LENGTH)
  if (detail !== undefined || !partial) input.detail = parseRequiredString(detail)
  if (deadline !== undefined || !partial) input.deadline = parseDate(deadline)
  if (member_ids !== undefined) input.member_ids = parseIdArray(member_ids)
  else if (!partial) input.member_ids = []

  if (Object.keys(input).length === 0) throw badRequest()
  return input
}

// GET /api/projects
export const list = async (_req: Request, res: Response) => {
  res.json(await projectService.list())
}

// GET /api/projects/:id
export const get = async (req: Request, res: Response) => {
  res.json(await projectService.get(parseId(req.params.id)))
}

// POST /api/projects
export const create = async (req: Request, res: Response) => {
  const input = parseProjectRequest(req.body, { partial: false }) as ProjectRequest
  res.status(201).json(await projectService.create(input, req.user!))
}

// PATCH /api/projects/:id
export const update = async (req: Request, res: Response) => {
  const id = parseId(req.params.id)
  const input = parseProjectRequest(req.body, { partial: true })
  res.json(await projectService.update(id, input, req.user!))
}

// DELETE /api/projects/:id
export const remove = async (req: Request, res: Response) => {
  await projectService.remove(parseId(req.params.id), req.user!)
  res.status(204).end()
}
