import type { Request, Response } from 'express'
import * as userService from '../services/userService'

// GET /api/users
export const list = async (req: Request, res: Response) => {
  res.json({ users: await userService.list(req.user!) })
}
