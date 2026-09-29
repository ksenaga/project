import { Avatar, type SxProps, type Theme } from '@mui/material'
import type { Member } from '../api/users'

const COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
]

// 同じユーザーは常に同じ色になるよう ID から決める
const avatarColor = (id: number) => COLORS[id % COLORS.length]

type Props = {
  user: Member
  size?: number
  sx?: SxProps<Theme>
}

const UserAvatar = ({ user, size = 28, sx }: Props) => (
  <Avatar
    alt={user.name}
    sx={[
      { width: size, height: size, fontSize: size * 0.45, bgcolor: avatarColor(user.id) },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {user.name.slice(0, 1).toUpperCase()}
  </Avatar>
)

export default UserAvatar
