import { Box, type SxProps, type Theme } from '@mui/material'
import type { ScreenRef } from '../api/screens'

// 画面名を、画面名の管理で決めた色のラベルで表示する(色は明るいので、文字は濃い色)
const ScreenLabel = ({ screen, sx }: { screen: ScreenRef; sx?: SxProps<Theme> }) => (
  <Box
    component="span"
    title={screen.name}
    sx={[
      {
        display: 'inline-block',
        maxWidth: '100%',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.6,
        color: 'text.primary',
        bgcolor: screen.color,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {screen.name}
  </Box>
)

export default ScreenLabel
