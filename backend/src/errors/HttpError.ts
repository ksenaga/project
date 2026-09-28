// status と message を持つエラー。errorHandler がこの内容でレスポンスを返す
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export const badRequest = () => new HttpError(400, 'リクエストが不正です。')

export const unauthorized = (message = 'ログインしてください') => new HttpError(401, message)

export const forbidden = () => new HttpError(403, '操作権限がありません')

export const notFound = () => new HttpError(404, '画面が存在しません')
