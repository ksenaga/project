import { badRequest } from '../errors/HttpError'

// 画像として受け付ける形式(画面では WebP に変換してから送る。WebP に書き出せないブラウザは PNG)
export const IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number]

// 画像の先頭のバイト列(ファイルの形式を表す)。Content-Type と中身が合っているかを確かめる
const MAGIC_BYTES: Record<ImageContentType, (data: Buffer) => boolean> = {
  'image/png': (data) =>
    data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (data) => data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/webp': (data) =>
    data.subarray(0, 4).toString('latin1') === 'RIFF' &&
    data.subarray(8, 12).toString('latin1') === 'WEBP',
}

// 本文が画像そのものになっているリクエスト(express.raw)を確かめ、形式とデータを返す
export const parseImageBody = (
  contentTypeHeader: string | undefined,
  body: unknown,
): { contentType: ImageContentType; data: Buffer } => {
  const contentType = contentTypeHeader?.split(';')[0].trim().toLowerCase() as ImageContentType
  if (
    !IMAGE_CONTENT_TYPES.includes(contentType) ||
    !Buffer.isBuffer(body) ||
    body.length === 0 ||
    !MAGIC_BYTES[contentType](body)
  ) {
    throw badRequest('画像は PNG・JPEG・WebP のいずれかにしてください')
  }
  return { contentType, data: body }
}
