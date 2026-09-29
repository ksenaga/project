export const ROLE = {
  ADMIN: 1, // 管理者
  LEADER: 2, // リーダー
  MEMBER: 3, // 一般ユーザー
} as const

export const ROLE_LABEL: Record<number, string> = {
  [ROLE.ADMIN]: '管理者',
  [ROLE.LEADER]: 'リーダー',
  [ROLE.MEMBER]: '一般ユーザー',
}
