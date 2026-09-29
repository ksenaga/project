import type { Request, Response } from 'express'
import * as tagRepository from '../repositories/tagRepository'

// GET /api/tags(ログインしていれば誰でも)
export const list = async (_req: Request, res: Response) => {
  res.json(await tagRepository.findAll())
}
