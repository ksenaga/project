import { Box } from '@mui/material'
import type { TagRef } from '../api/tags'

type Props = {
  tag: TagRef
  size?: 'small' | 'medium'
}

// タグの色付きラベル
const TagLabel = ({ tag, size = 'small' }: Props) => (
  <Box
    component="span"
    sx={{
      display: 'inline-block',
      flexShrink: 0,
      px: size === 'small' ? 0.6 : 1,
      py: size === 'small' ? 0.1 : 0.25,
      borderRadius: 1,
      fontSize: size === 'small' ? 10 : 13,
      fontWeight: 700,
      lineHeight: 1.6,
      whiteSpace: 'nowrap',
      bgcolor: tag.color,
      color: tag.text_color,
    }}
  >
    {tag.name}
  </Box>
)

export default TagLabel
