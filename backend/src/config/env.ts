import 'dotenv/config'

const required = (key: string): string => {
  const value = process.env[key]
  if (!value) throw new Error(`環境変数 ${key} が設定されていません`)
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: required('JWT_SECRET'),
  // ビルドしたフロントエンド(frontend/dist)の場所。指定したときだけ、API と一緒に画面も配る(コンテナで使う)。
  // 開発中は Vite が画面を配るので指定しない
  staticDir: process.env.STATIC_DIR || undefined,
}
