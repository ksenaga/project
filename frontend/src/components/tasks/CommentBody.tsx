import { Box } from '@mui/material'
import type { Member } from '../../api/users'
import { splitMentions } from '../../utils/mention'
import LinkifiedText from '../LinkifiedText'

type Props = {
  text: string
  // メンションとして目立たせるユーザー
  users: Member[]
  // 自分へのメンションはさらに目立たせる
  myId: number
}

// コメントの本文。「@ユーザー名」を目立たせ、URL・「#タスクID」はリンクにする
const CommentBody = ({ text, users, myId }: Props) => (
  <>
    {splitMentions(text, users).map((part, i) =>
      part.type === 'text' ? (
        <LinkifiedText key={i} text={part.text} />
      ) : (
        <Box
          key={i}
          component="span"
          sx={{
            fontWeight: 700,
            borderRadius: 1,
            px: 0.25,
            ...(part.user.id === myId
              ? { bgcolor: 'rgba(245, 158, 11, 0.22)', color: 'warning.dark' }
              : { bgcolor: 'rgba(79, 70, 229, 0.1)', color: 'primary.main' }),
          }}
        >
          @{part.user.name}
        </Box>
      ),
    )}
  </>
)

export default CommentBody
