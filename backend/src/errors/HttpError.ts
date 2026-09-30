// status と message を持つエラー。errorHandler がこの内容でレスポンスを返す。
// code は画面でエラーの種類を見分けたいときに付ける(例: 同時編集の衝突)
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
  }
}

export const badRequest = (message = 'リクエストが不正です。') => new HttpError(400, message)

export const unauthorized = (message = 'ログインしてください') => new HttpError(401, message)

export const forbidden = (message = '操作権限がありません') => new HttpError(403, message)

export const notFound = (message = '画面が存在しません') => new HttpError(404, message)

export const conflict = (message: string, code?: string) => new HttpError(409, message, code)
