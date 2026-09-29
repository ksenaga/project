import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import { useDraggable } from '@dnd-kit/core'
import type { TaskSummary } from '../../api/tasks'
import { DEADLINE_COLOR_STYLE, deadlineColorOf } from '../../constants/deadlineColor'
import { formatDate } from '../../utils/date'
import UserAvatar from '../UserAvatar'

// カードの見た目(ドラッグ中に指に付いてくる DragOverlay でも使う)
export const TaskCardContent = ({
  task,
  lifted = false,
}: {
  task: TaskSummary
  lifted?: boolean
}) => {
  // 7日以内は赤、8〜14日は黄色、15日以上は黄緑。完了・対応中止は色を付けない
  const color = deadlineColorOf(task)
  const colorStyle = color && DEADLINE_COLOR_STYLE[color]

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: 1,
        borderColor: 'divider',
        boxShadow: lifted
          ? '0 12px 28px -8px rgba(15, 23, 42, 0.35)'
          : '0 1px 2px rgba(15, 23, 42, 0.06)',
        transform: lifted ? 'rotate(2deg)' : undefined,
      }}
    >
      {task.screen && (
        <Typography
          variant="caption"
          component="p"
          noWrap
          sx={{ color: 'primary.main', fontWeight: 600, mb: 0.25 }}
        >
          {task.screen.name}
        </Typography>
      )}
      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word', mb: 1 }}>
        {task.title}
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            fontSize: 12,
            fontWeight: colorStyle ? 600 : undefined,
            ...(colorStyle
              ? { bgcolor: colorStyle.bg, color: colorStyle.text }
              : { color: 'text.secondary' }),
          }}
        >
          <EventOutlinedIcon sx={{ fontSize: 14 }} />
          {formatDate(task.deadline)}
        </Box>
        <Tooltip title={`担当: ${task.assignee.name}`}>
          <span style={{ display: 'inline-flex' }}>
            <UserAvatar user={task.assignee} size={24} />
          </span>
        </Tooltip>
      </Stack>
    </Paper>
  )
}

type Props = {
  task: TaskSummary
  draggable: boolean
  onOpen: () => void
}

// ドラッグできるカード。クリック(または Enter)で詳細を開く
const TaskCard = ({ task, draggable, onOpen }: Props) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggable,
  })

  // ドラッグできないカードも、クリックで詳細は開ける。
  // そのため「無効」「ドラッグ可能」とは読み上げさせない
  const {
    'aria-disabled': _disabled,
    'aria-roledescription': roleDescription,
    'aria-describedby': describedBy,
    ...a11yAttributes
  } = attributes

  return (
    <Box
      ref={setNodeRef}
      {...a11yAttributes}
      aria-roledescription={draggable ? roleDescription : undefined}
      aria-describedby={draggable ? describedBy : undefined}
      {...listeners}
      aria-label={`${task.title}（担当: ${task.assignee.name}、期限: ${formatDate(task.deadline)}）`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
        else listeners?.onKeyDown?.(e)
      }}
      sx={{
        borderRadius: 3,
        cursor: draggable ? 'grab' : 'pointer',
        opacity: isDragging ? 0.35 : 1,
        '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
        '&:hover .MuiPaper-root': { borderColor: 'primary.light' },
      }}
    >
      <TaskCardContent task={task} />
    </Box>
  )
}

export default TaskCard
