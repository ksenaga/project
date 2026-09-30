import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
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
import { canDeleteTask, canEditTask } from '../../utils/taskPermission'
import LinkifiedText from '../LinkifiedText'
import TagLabel from '../TagLabel'
import UserAvatar from '../UserAvatar'
import CancelRequestDialog from './CancelRequestDialog'
import TaskComments from './TaskComments'

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
      未入力
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
      slotProps={{ paper: { sx: { ...scaledTextSx, px: 1.5 } } }}
    >
      {error && (
        <DialogContent>
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
          <DialogTitle
            // 右上のボタンにタイトルが重ならないよう、右に余白を空ける
            sx={{ pt: 3.5, pb: 2, position: 'relative', pr: canRequestCancel ? 22 : undefined }}
          >
            {canRequestCancel && (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<BlockOutlinedIcon />}
                onClick={() => setCancelOpen(true)}
                disabled={cancelSent !== null}
                sx={{ position: 'absolute', top: 24, right: 24 }}
              >
                {cancelSent !== null ? '中止依頼済み' : '中止依頼'}
              </Button>
            )}
            <Chip
              label={
                task.list_id !== null
                  ? (lists.find((list) => list.id === task.list_id)?.name ?? task.status)
                  : task.status
              }
              size="small"
              sx={{
                mb: 1,
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
            <Typography
              variant="h6"
              component="p"
              sx={{ fontWeight: 700, wordBreak: 'break-word' }}
            >
              {task.title}
            </Typography>
          </DialogTitle>
          {/* 左に詳細、右にコメント */}
          <DialogContent
            sx={{
              pb: 3.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 400px' },
              gap: 4,
            }}
          >
            <Stack spacing={3}>
              {cancelSent !== null && (
                <Alert severity="success" onClose={() => setCancelSent(null)}>
                  中止依頼を送りました（{cancelSent}人に通知しました）
                </Alert>
              )}
              {task.status === TASK_STATUS.DONE && (
                <Alert severity="info">完了したタスクは編集できません</Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                <Field label="期限">
                  <Typography variant="body2">{formatDate(task.deadline)}</Typography>
                </Field>
                <Field label="画面名">
                  {/* 画面名を必須にする前に作ったタスクは、画面名がない場合がある */}
                  <Text value={task.screen?.name ?? null} />
                </Field>
              </Box>
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
                    未入力
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
              <Field label="説明">
                <Text value={task.detail} linkify />
              </Field>
              <Field label="修正内容">
                <Text value={task.modified} linkify />
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
            <Box
              component="aside"
              sx={{
                borderLeft: { md: 1 },
                borderColor: { md: 'divider' },
                pl: { md: 3 },
                // 詳細が短くてもコメント欄は見やすい高さにし、長いときはコメント欄の中でスクロールする
                height: { md: '60vh' },
                minHeight: 0,
              }}
            >
              <TaskComments
                user={user}
                projectId={projectId}
                taskId={task.id}
                onChanged={onCommentsChanged}
              />
            </Box>
          </DialogContent>
        </>
      )}
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {task && canDeleteTask(user) && (
          <Button color="error" onClick={() => onDelete(task)} sx={{ mr: 'auto' }}>
            削除
          </Button>
        )}
        <Button onClick={onClose} color="inherit">
          閉じる
        </Button>
        {/* プロジェクトメンバーなら誰でもタスクを作成できるので、コピーも全員できる */}
        {task && (
          <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => onCopy(task)}>
            コピー
          </Button>
        )}
        {task && canEditTask(user, task) && (
          <Button variant="contained" onClick={() => onEdit(task)}>
            編集
          </Button>
        )}
      </DialogActions>
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
