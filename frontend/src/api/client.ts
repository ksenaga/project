export class ApiError extends Error {
  readonly status: number
  // サーバーがエラーの種類を付けたとき(例: TASK_UPDATED_BY_OTHERS)
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
}

// /api への fetch。失敗時はサーバーの message を持つ ApiError を投げる
export const request = async <T>(path: string, { method = 'GET', body }: RequestOptions = {}) => {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'サーバーに接続できませんでした')
  }

  if (!res.ok) {
    const data: { message?: string; code?: string } | null = await res.json().catch(() => null)
    throw new ApiError(res.status, data?.message ?? 'エラーが発生しました', data?.code)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
