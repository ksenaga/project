import { Box } from '@mui/material'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import type { TaskSummary } from '../api/tasks'
import { DEADLINE_COLOR_STYLE, deadlineColorOf } from '../constants/deadlineColor'
import { formatDate } from '../utils/date'

// 期限を、今日からの日数の色(赤・黄色・緑)で表示する。完了・対応中止のタスクは色を付けない
const DeadlineLabel = ({ task }: { task: Pick<TaskSummary, 'status' | 'deadline'> }) => {
  const color = deadlineColorOf(task)
  const style = color && DEADLINE_COLOR_STYLE[color]
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        fontSize: 13,
        whiteSpace: 'nowrap',
        fontWeight: style ? 600 : undefined,
        ...(style ? { bgcolor: style.bg, color: style.text } : { color: 'text.secondary' }),
      }}
    >
      <EventOutlinedIcon sx={{ fontSize: 15 }} />
      {formatDate(task.deadline)}
    </Box>
  )
}

export default DeadlineLabel
