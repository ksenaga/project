import type { Request, Response } from 'express'
import * as notificationService from '../services/notificationService'
import { parseId } from '../validators/common'

// GET /api/notifications
export const list = async (req: Request, res: Response) => {
  res.json(await notificationService.list(req.user!))
}

// POST /api/notifications/:id/read
export const markRead = async (req: Request, res: Response) => {
  await notificationService.markRead(parseId(req.params.id), req.user!)
  res.status(204).end()
}

// POST /api/notifications/read-all
export const markAllRead = async (req: Request, res: Response) => {
  await notificationService.markAllRead(req.user!)
  res.status(204).end()
}
