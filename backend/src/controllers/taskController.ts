import type { Request, Response } from 'express'
import { badRequest } from '../errors/HttpError'
import * as taskService from '../services/taskService'
import { TASK_STATUS, TASK_STATUSES, type TaskFilter, type TaskInput } from '../types/task'
import {
  parseBody,
  parseDate,
  parseEnum,
  parseId,
  parseOptionalString,
  parseRequiredString,
} from '../validators/common'

const TITLE_MAX_LENGTH = 50
const VARCHAR_MAX_LENGTH = 255

// partial: true のときは送られてきた項目だけチェックする(PATCH 用)
const parseTaskInput = (body: unknown, { partial }: { partial: boolean }) => {
  const b = parseBody(body)
  const input: Partial<TaskInput> = {}
  const has = (key: keyof TaskInput) => b[key] !== undefined

  // 必須項目
  if (has('title') || !partial) input.title = parseRequiredString(b.title, TITLE_MAX_LENGTH)
  if (has('detail') || !partial) input.detail = parseRequiredString(b.detail)
  if (has('user_id') || !partial) input.user_id = parseId(b.user_id)
  if (has('deadline') || !partial) input.deadline = parseDate(b.deadline)
  // 画面名は必須(「画面名の管理」で登録したものから選ぶ)。PATCH で送る場合も null は不可
  if (has('screen_id') || !partial) {
    if (b.screen_id === null || b.screen_id === undefined)
      throw badRequest('画面名を選んでください')
    input.screen_id = parseId(b.screen_id)
  }
  if (has('status')) input.status = parseEnum(b.status, TASK_STATUSES)
  else if (!partial) input.status = TASK_STATUS.TODO

  // 任意項目
  if (has('modified')) input.modified = parseOptionalString(b.modified)
  if (has('reason')) input.reason = parseOptionalString(b.reason)
  if (has('git')) input.git = parseOptionalString(b.git, VARCHAR_MAX_LENGTH)
  if (has('memo')) input.memo = parseOptionalString(b.memo)

  if (Object.keys(input).length === 0) throw badRequest()
  return input
}

const Q_MAX_LENGTH = 100

// 一覧の絞り込み条件(?q=文字&assignee_id=1&screen_id=2)。screen_id=none は画面名が未設定
const parseTaskFilter = (query: Request['query']): TaskFilter => {
  const filter: TaskFilter = {}
  const { q, assignee_id, screen_id } = query
  if (q !== undefined) {
    if (typeof q !== 'string' || q.length > Q_MAX_LENGTH) throw badRequest()
    if (q.trim() !== '') filter.q = q.trim()
  }
  if (assignee_id !== undefined && assignee_id !== '') filter.assigneeId = parseId(assignee_id)
  if (screen_id !== undefined && screen_id !== '') {
    filter.screenId = screen_id === 'none' ? null : parseId(screen_id)
  }
  return filter
}

const params = (req: Request) => ({
  projectId: parseId(req.params.projectId),
  id: req.params.id === undefined ? undefined : parseId(req.params.id),
})

// GET /api/projects/:projectId/tasks
export const list = async (req: Request, res: Response) => {
  const { projectId } = params(req)
  res.json(await taskService.list(projectId, parseTaskFilter(req.query), req.user!))
}

// GET /api/projects/:projectId/tasks/:id
export const get = async (req: Request, res: Response) => {
  const { projectId, id } = params(req)
  res.json(await taskService.get(projectId, id!, req.user!))
}

// POST /api/projects/:projectId/tasks
export const create = async (req: Request, res: Response) => {
  const { projectId } = params(req)
  const input = parseTaskInput(req.body, { partial: false }) as TaskInput
  res.status(201).json(await taskService.create(projectId, input, req.user!))
}

// PATCH /api/projects/:projectId/tasks/:id
export const update = async (req: Request, res: Response) => {
  const { projectId, id } = params(req)
  const input = parseTaskInput(req.body, { partial: true })
  res.json(await taskService.update(projectId, id!, input, req.user!))
}

// DELETE /api/projects/:projectId/tasks/:id
export const remove = async (req: Request, res: Response) => {
  const { projectId, id } = params(req)
  await taskService.remove(projectId, id!, req.user!)
  res.status(204).end()
}
