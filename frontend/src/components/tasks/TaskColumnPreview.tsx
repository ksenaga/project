import { Box, Stack, Typography } from '@mui/material'
import type { BoardList } from '../../api/boardLists'

// リストをドラッグしている間、指に付いてくる見た目(DragOverlay で使う)
const TaskColumnPreview = ({ list, count }: { list: BoardList; count: number }) => (
  <Box
    sx={{
      width: 256,
      bgcolor: list.color,
      borderRadius: 3,
      p: 1,
      boxShadow: '0 12px 28px -8px rgba(15, 23, 42, 0.35)',
      transform: 'rotate(2deg)',
      cursor: 'grabbing',
    }}
  >
    <Stack direction="row" sx={{ alignItems: 'center', px: 0.5, pb: 0.75 }}>
      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, flexGrow: 1 }}>
        {list.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {count}
      </Typography>
    </Stack>
    <Box sx={{ height: 56, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.55)' }} />
  </Box>
)

export default TaskColumnPreview
