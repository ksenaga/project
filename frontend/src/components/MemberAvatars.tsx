import { useLayoutEffect, useRef, useState } from 'react'
import { Avatar, Box, Tooltip, Typography } from '@mui/material'
import type { Member } from '../api/users'
import UserAvatar from './UserAvatar'

type Props = {
  members: Member[]
  size?: number
}

const OVERLAP = 6 // アバター同士を重ねる幅(px)
const BORDER = 2 // アバターの白い縁取り(px)

// 横幅に入るだけアバターを並べ、入りきらない人数を「+N」で表示する
const MemberAvatars = ({ members, size = 28 }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 1人目はアバターの幅、2人目以降は重なりを除いた幅だけ場所を使う
  const outer = size + BORDER * 2
  const step = outer - OVERLAP
  const capacity = Math.max(1, Math.floor((width - outer) / step) + 1)
  // 全員入らないときは、最後の1枠を「+N」に使う
  const visibleCount = members.length <= capacity ? members.length : Math.max(capacity - 1, 0)
  const visible = members.slice(0, visibleCount)
  const hidden = members.slice(visibleCount)

  const avatarSx = (index: number) => ({
    ml: index === 0 ? 0 : `-${OVERLAP}px`,
    border: `${BORDER}px solid`,
    borderColor: 'background.paper',
    boxSizing: 'content-box' as const,
  })

  return (
    <Box
      ref={ref}
      role="group"
      aria-label={`メンバー: ${members.map((m) => m.name).join('、')}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        minWidth: 0,
        minHeight: size + 4,
      }}
    >
      {members.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          メンバー未設定
        </Typography>
      )}
      {visible.map((member, i) => (
        <Tooltip key={member.id} title={member.name}>
          <span style={{ display: 'inline-flex' }}>
            <UserAvatar user={member} size={size} sx={avatarSx(i)} />
          </span>
        </Tooltip>
      ))}
      {hidden.length > 0 && (
        <Tooltip title={hidden.map((m) => m.name).join('、')}>
          <Avatar
            sx={{
              ...avatarSx(visible.length),
              width: size,
              height: size,
              fontSize: size * 0.4,
              fontWeight: 600,
              bgcolor: 'grey.300',
              color: 'text.primary',
            }}
          >
            +{hidden.length}
          </Avatar>
        </Tooltip>
      )}
    </Box>
  )
}

export default MemberAvatars
