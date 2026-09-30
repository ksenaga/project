import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import { fetchTask, requestTaskCancel, type Task } from '../../api/tasks'
import type { BoardList } from '../../api/boardLists'
import type { Tag } from '../../api/tags'
import { ROLE } from '../../constants/role'
import {
  CLOSED_STATUSES,
  CUSTOM_LIST_COLOR,
  TASK_STATUS,
  TASK_STATUS_COLOR,
} from '../../constants/taskStatus'
import type { LoginUser } from '../../pages/LoginPage'
import { formatDate } from '../../utils/date'
import { taskLink } from '../../utils/taskLink'
import { canDeleteTask, canEditTask } from '../../utils/taskPermission'
import LinkifiedText from '../LinkifiedText'
import TagLabel from '../TagLabel'
import UserAvatar from '../UserAvatar'
import CancelRequestDialog from './CancelRequestDialog'
import TaskComments from './TaskComments'
import TaskImageGallery from './TaskImageGallery'

type Props = {
  user: LoginUser
  projectId: number
  taskId: number
  onClose: () => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onCopy: (task: Task) => void
  // 追加したリストに入っているタスクは、ステータスの代わりにリスト名を表示する
  lists: BoardList[]
  // タグの意味を表示するため
  tags: Tag[]
  // コメントを投稿・削除したとき
  onCommentsChanged: () => void
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
      {label}
    </Typography>
    <Box sx={{ mt: 0.5 }}>{children}</Box>
  </Box>
)

// linkify: true なら文章中の URL をリンクにする(チケットの URL などを貼って開けるように)
const Text = ({ value, linkify = false }: { value: string | null; linkify?: boolean }) =>
  value ? (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {linkify ? <LinkifiedText text={value} /> : value}
    </Typography>
  ) : (
    <Typography variant="body2" color="text.disabled">
      —
    </Typography>
  )

const isHttpUrl = (value: string) => /^https?:\/\//.test(value)

// 詳細は読みやすいよう、文字をテーマの標準サイズの 1.3 倍にする
const SCALE = 1.3
const scaledTextSx = {
  '& .MuiTypography-body2': { fontSize: `${0.875 * SCALE}rem` },
  '& .MuiTypography-caption': { fontSize: `${0.75 * SCALE}rem` },
  '& .MuiTypography-h6': { fontSize: `${1.25 * SCALE}rem` },
  '& .MuiChip-root': { height: 24 * SCALE, fontSize: `${0.8125 * SCALE}rem` },
  '& .MuiButton-root': { fontSize: `${0.875 * SCALE}rem` },
  '& .MuiAlert-message': { fontSize: `${0.875 * SCALE}rem` },
}

const TaskDetailDialog = ({
  user,
  projectId,
  taskId,
  onClose,
  onEdit,
  onDelete,
  onCopy,
  lists,
  tags,
  onCommentsChanged,
}: Props) => {
  const [task, setTask] = useState<Task | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  // 右上の「⋮」で開くメニュー(編集・コピー・削除)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  // 中止依頼を送ったとき(通知した人数)
  const [cancelSent, setCancelSent] = useState<number | null>(null)
  // 一般ユーザーは、完了・対応中止でないタスクの中止を管理者・リーダーに依頼できる
  // (担当者に含まれるタスクのみ)
  const canRequestCancel =
    task !== null &&
    user.role === ROLE.MEMBER &&
    task.assignees.some((assignee) => assignee.id === user.id) &&
    !(CLOSED_STATUSES.includes(task.status) && task.list_id === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchTask(projectId, taskId)
      .then((data) => !ignore && setTask(data))
      .catch((err: unknown) => !ignore && setError((err as Error).message))
    return () => {
      ignore = true
    }
  }, [projectId, taskId])

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      // 高さを決めておき、詳細とコメントはそれぞれの中でスクロールする
      slotProps={{
        paper: {
          sx: {
            ...scaledTextSx,
            height: 'min(90vh, 960px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* 上の帯: 左にステータス、右に中止依頼(一般ユーザー)/「⋮」(編集・コピー・削除)/閉じる */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          px: 3,
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        {task && (
          <Chip
            label={
              task.list_id !== null
                ? (lists.find((list) => list.id === task.list_id)?.name ?? task.status)
                : task.status
            }
            size="small"
            sx={{
              // 追加したリストはそのリストの色(明るい色なので文字は濃い色)
              ...(task.list_id !== null
                ? {
                    bgcolor:
                      lists.find((list) => list.id === task.list_id)?.color ?? CUSTOM_LIST_COLOR,
                    color: 'text.primary',
                  }
                : { bgcolor: TASK_STATUS_COLOR[task.status], color: 'common.white' }),
              fontWeight: 600,
            }}
          />
        )}
        <Box sx={{ flexGrow: 1 }} />
        {canRequestCancel && (
          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<BlockOutlinedIcon />}
            onClick={() => setCancelOpen(true)}
            disabled={cancelSent !== null}
            sx={{ mr: 0.5 }}
          >
            {cancelSent !== null ? '中止依頼済み' : '中止依頼'}
          </Button>
        )}
        {task && (
          <Tooltip title="その他の操作">
            <IconButton
              aria-label="その他の操作"
              aria-haspopup="menu"
              aria-expanded={menuAnchor !== null}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="閉じる">
          <IconButton aria-label="閉じる" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      {task && (
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 160 } } }}
        >
          {/* 編集できないタスク(完了・一般ユーザーの他人のタスク)では押せない */}
          <MenuItem
            disabled={!canEditTask(user, task)}
            onClick={() => {
              setMenuAnchor(null)
              onEdit(task)
            }}
          >
            <ListItemIcon>
              <EditOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>編集</ListItemText>
          </MenuItem>
          {/* プロジェクトメンバーなら誰でもタスクを作成できるので、コピーも全員できる */}
          <MenuItem
            onClick={() => {
              setMenuAnchor(null)
              onCopy(task)
            }}
          >
            <ListItemIcon>
              <ContentCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>コピー</ListItemText>
          </MenuItem>
          {/* 削除は管理者・リーダーのみ(一般ユーザーには出さない) */}
          {canDeleteTask(user) && (
            <MenuItem
              onClick={() => {
                setMenuAnchor(null)
                onDelete(task)
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                <DeleteOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>削除</ListItemText>
            </MenuItem>
          )}
        </Menu>
      )}
      {error && (
        <DialogContent sx={{ pt: 8 }}>
          <Alert severity="error">{error}</Alert>
        </DialogContent>
      )}
      {!task && !error && (
        <DialogContent sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </DialogContent>
      )}
      {task && (
        <>
          {/* 左に詳細(スクロール)、右にコメント(入力欄は一番下に固定) */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 440px' },
              gridTemplateRows: { xs: 'minmax(0, 1fr) minmax(0, 1fr)', md: 'minmax(0, 1fr)' },
            }}
          >
            <Box sx={{ overflowY: 'auto', px: 4, py: 3 }}>
              {/* タスク名の横に、このタスクのリンクをコピーするボタン */}
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Typography
                  variant="h6"
                  component="p"
                  sx={{ fontWeight: 700, wordBreak: 'break-word' }}
                >
                  {task.title}
                </Typography>
                <Tooltip
                  title={
                    linkCopied
                      ? 'コピーしました'
                      : 'リンクをコピー（コメントに貼るとタスク名で表示されます）'
                  }
                >
                  <IconButton
                    size="small"
                    aria-label="タスクのリンクをコピー"
                    onClick={async () => {
                      await navigator.clipboard
                        .writeText(`${window.location.origin}${taskLink(task.id)}`)
                        .catch(() => {})
                      setLinkCopied(true)
                    }}
                    onMouseLeave={() => setLinkCopied(false)}
                    sx={{ flexShrink: 0 }}
                  >
                    <LinkOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack spacing={3} sx={{ mt: 3 }}>
                {cancelSent !== null && (
                  <Alert severity="success" onClose={() => setCancelSent(null)}>
                    中止依頼を送りました（{cancelSent}人に通知しました）
                  </Alert>
                )}
                {task.status === TASK_STATUS.DONE && (
                  <Alert severity="info">完了したタスクは編集できません</Alert>
                )}
                {/* 期限・画面名 / 担当者・タグ の2行2列 */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5 }}>
                  <Field label="期限">
                    <Typography variant="body2">{formatDate(task.deadline)}</Typography>
                  </Field>
                  <Field label="画面名">
                    {/* 画面名を必須にする前に作ったタスクは、画面名がない場合がある */}
                    <Text value={task.screen?.name ?? null} />
                  </Field>
                  <Field label="担当者">
                    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                      {task.assignees.map((assignee) => (
                        <Stack
                          key={assignee.id}
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center' }}
                        >
                          <UserAvatar user={assignee} size={28} />
                          <Typography variant="body2">{assignee.name}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Field>
                  <Field label="タグ">
                    {task.tags.length === 0 ? (
                      <Typography variant="body2" color="text.disabled">
                        —
                      </Typography>
                    ) : (
                      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {task.tags.map((tag) => (
                          <Tooltip
                            key={tag.id}
                            title={tags.find((t) => t.id === tag.id)?.description ?? ''}
                          >
                            <span>
                              <TagLabel tag={tag} size="medium" />
                            </span>
                          </Tooltip>
                        ))}
                      </Stack>
                    )}
                  </Field>
                </Box>
                <Field label="説明">
                  <Text value={task.detail} linkify />
                </Field>
                <Field label="修正内容">
                  {/* 画像だけ貼って文字がないときは「—」を出さない */}
                  {(task.modified || (task.modified_images ?? []).length === 0) && (
                    <Text value={task.modified} linkify />
                  )}
                  <TaskImageGallery images={task.modified_images ?? []} />
                </Field>
                <Field label="修正理由">
                  <Text value={task.reason} linkify />
                </Field>
                <Field label="Git URL">
                  {task.git && isHttpUrl(task.git) ? (
                    <Link
                      href={task.git}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{ wordBreak: 'break-all' }}
                    >
                      {task.git}
                    </Link>
                  ) : (
                    <Text value={task.git} />
                  )}
                </Field>
                <Field label="メモ">
                  <Text value={task.memo} linkify />
                </Field>
              </Stack>
            </Box>
            <Box
              component="aside"
              sx={{
                bgcolor: 'grey.50',
                borderLeft: { md: 1 },
                borderTop: { xs: 1, md: 0 },
                borderColor: 'divider',
                px: 2.5,
                pt: 2.5,
                pb: 2,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <TaskComments
                user={user}
                projectId={projectId}
                taskId={task.id}
                onChanged={onCommentsChanged}
              />
            </Box>
          </Box>
        </>
      )}
      {cancelOpen && task && (
        <CancelRequestDialog
          taskTitle={task.title}
          onClose={() => setCancelOpen(false)}
          onSend={async (reason) => {
            const { notified } = await requestTaskCancel(projectId, task.id, reason)
            setCancelOpen(false)
            setCancelSent(notified)
          }}
        />
      )}
    </Dialog>
  )
}

export default TaskDetailDialog
