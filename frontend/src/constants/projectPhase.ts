// プロジェクトのフェーズ(プルダウンの並び順)
export const PROJECT_PHASES = [
  '企画',
  '要件定義',
  '設計',
  '開発',
  'テスト',
  'リリース',
  '保守',
  '終了',
] as const

export type ProjectPhase = (typeof PROJECT_PHASES)[number]
