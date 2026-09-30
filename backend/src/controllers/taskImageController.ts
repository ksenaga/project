import type { Request, Response } from 'express'
import * as taskImageService from '../services/taskImageService'
import { parseId } from '../validators/common'
import { parseImageBody } from '../validators/image'

// POST /api/projects/:projectId/task-images(本文は画像のデータそのもの。Content-Type で形式を指定する)
export const upload = async (req: Request, res: Response) => {
  const { contentType, data } = parseImageBody(req.get('Content-Type'), req.body)
  res
    .status(201)
    .json(
      await taskImageService.upload(parseId(req.params.projectId), contentType, data, req.user!),
    )
}

// GET /api/projects/:projectId/task-images/:id
// 画像は変わらないので、長くキャッシュしてよい
export const get = async (req: Request, res: Response) => {
  const image = await taskImageService.get(
    parseId(req.params.projectId),
    parseId(req.params.id),
    req.user!,
  )
  res
    .set('Content-Type', image.content_type)
    .set('Cache-Control', 'private, max-age=31536000, immutable')
    .set('X-Content-Type-Options', 'nosniff')
    .send(image.data)
}
