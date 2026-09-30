import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import { useDraggable } from '@dnd-kit/core'
import type { TaskSummary } from '../../api/tasks'
import { DEADLINE_COLOR_STYLE, deadlineColorOf } from '../../constants/deadlineColor'
import { formatDate } from '../../utils/date'
import MarqueeText from '../MarqueeText'
import TagLabel from '../TagLabel'
import UserAvatar from '../UserAvatar'

// 担当者のアイコンは3人まで並べ、それ以上は「+N」で表示する
const MAX_AVATARS = 3
// タイトルの右端に出すタグは2つまで。それ以上は「+N」で表示する
const MAX_TAGS = 2
// 「緊急」は見落とさないよう、カードでは必ず先頭に出す
const URGENT_TAG_NAME = '緊急'

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
  const assigneeNames = task.assignees.map((assignee) => assignee.name).join('、')
  const tags = [
    ...task.tags.filter((tag) => tag.name === URGENT_TAG_NAME),
    ...task.tags.filter((tag) => tag.name !== URGENT_TAG_NAME),
  ]

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
      {/* タイトル(長いときは横に流れる)と、右端にタグ */}
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1 }}>
        <MarqueeText
          text={task.title}
          sx={{ flexGrow: 1, fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 }}
        />
        {tags.length > 0 && (
          <Tooltip title={tags.map((tag) => tag.name).join('・')}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              {tags.slice(0, MAX_TAGS).map((tag) => (
                <TagLabel key={tag.id} tag={tag} />
              ))}
              {tags.length > MAX_TAGS && (
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  +{tags.length - MAX_TAGS}
                </Typography>
              )}
            </Stack>
          </Tooltip>
        )}
      </Stack>
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
        {task.comment_count > 0 && (
          <Stack
            direction="row"
            spacing={0.25}
            sx={{ alignItems: 'center', color: 'text.secondary', ml: 1, mr: 'auto' }}
            aria-label={`コメント${task.comment_count}件`}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption">{task.comment_count}</Typography>
          </Stack>
        )}
        <Tooltip title={`担当: ${assigneeNames}`}>
          <Stack direction="row" sx={{ alignItems: 'center' }}>
            {task.assignees.slice(0, MAX_AVATARS).map((assignee, i) => (
              <UserAvatar
                key={assignee.id}
                user={assignee}
                size={24}
                sx={{
                  ml: i === 0 ? 0 : '-6px',
                  border: '2px solid',
                  borderColor: 'background.paper',
                  boxSizing: 'content-box',
                }}
              />
            ))}
            {task.assignees.length > MAX_AVATARS && (
              <Typography
                variant="caption"
                sx={{ ml: 0.5, fontWeight: 600, color: 'text.secondary' }}
              >
                +{task.assignees.length - MAX_AVATARS}
              </Typography>
            )}
          </Stack>
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
      aria-label={`${task.title}（${task.tags.length > 0 ? `タグ: ${task.tags.map((t) => t.name).join('・')}、` : ''}担当: ${task.assignees.map((a) => a.name).join('、')}、期限: ${formatDate(task.deadline)}）`}
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
