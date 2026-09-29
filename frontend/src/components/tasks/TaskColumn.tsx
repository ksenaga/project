import type { ReactNode } from 'react'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useDroppable } from '@dnd-kit/core'
import { TASK_STATUS_COLOR, type TaskStatus } from '../../constants/taskStatus'

type Props = {
  status: TaskStatus
  count: number
  // ドラッグ中のカードをこの列に置けるか(ドラッグしていないときは undefined)
  acceptsDrop?: boolean
  canAdd: boolean
  onAdd: () => void
  children: ReactNode
}

// ステータスごとの列。カードをドロップするとそのステータスになる
const TaskColumn = ({ status, count, acceptsDrop, canAdd, onAdd, children }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: acceptsDrop === false })
  const dragging = acceptsDrop !== undefined

  return (
    <Box
      component="section"
      aria-label={`${status}（${count}件）`}
      sx={{
        // 画面幅に合わせて伸縮し、狭いときはボードが横スクロールする
        flex: '1 0 240px',
        maxWidth: 340,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        bgcolor: '#eef2f7',
        borderRadius: 3,
        border: 2,
        borderColor: isOver && acceptsDrop ? 'primary.main' : 'transparent',
        opacity: dragging && !acceptsDrop ? 0.5 : 1,
        transition: 'opacity 0.15s, border-color 0.15s',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1.5, pt: 1.25, pb: 1 }}>
        <Box
          sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: TASK_STATUS_COLOR[status] }}
        />
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {status}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {count}
        </Typography>
        {canAdd && (
          <Tooltip title={`${status}にタスクを追加`}>
            <IconButton size="small" aria-label={`${status}にタスクを追加`} onClick={onAdd}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Stack
        ref={setNodeRef}
        spacing={1}
        sx={{ px: 1, pb: 1, minHeight: 72, overflowY: 'auto', flexGrow: 1 }}
      >
        {children}
      </Stack>
    </Box>
  )
}

export default TaskColumn
