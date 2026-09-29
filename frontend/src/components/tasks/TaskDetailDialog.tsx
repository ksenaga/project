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
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { fetchTask, type Task } from '../../api/tasks'
import { TASK_STATUS, TASK_STATUS_COLOR } from '../../constants/taskStatus'
import type { LoginUser } from '../../pages/LoginPage'
import { formatDate } from '../../utils/date'
import { canDeleteTask, canEditTask } from '../../utils/taskPermission'
import UserAvatar from '../UserAvatar'

type Props = {
  user: LoginUser
  projectId: number
  taskId: number
  onClose: () => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onCopy: (task: Task) => void
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
      {label}
    </Typography>
    <Box sx={{ mt: 0.5 }}>{children}</Box>
  </Box>
)

const Text = ({ value }: { value: string | null }) =>
  value ? (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {value}
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
}: Props) => {
  const [task, setTask] = useState<Task | null>(null)
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
          <DialogTitle sx={{ pt: 3.5, pb: 2 }}>
            <Chip
              label={task.status}
              size="small"
              sx={{
                mb: 1,
                bgcolor: TASK_STATUS_COLOR[task.status],
                color: 'common.white',
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
          <DialogContent sx={{ pb: 3.5 }}>
            <Stack spacing={3}>
              {task.status === TASK_STATUS.DONE && (
                <Alert severity="info">完了したタスクは編集できません</Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                <Field label="担当者">
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <UserAvatar user={task.assignee} size={28} />
                    <Typography variant="body2">{task.assignee.name}</Typography>
                  </Stack>
                </Field>
                <Field label="期限">
                  <Typography variant="body2">{formatDate(task.deadline)}</Typography>
                </Field>
                <Field label="画面名">
                  {/* 画面名を必須にする前に作ったタスクは、画面名がない場合がある */}
                  <Text value={task.screen?.name ?? null} />
                </Field>
              </Box>
              <Field label="説明">
                <Text value={task.detail} />
              </Field>
              <Field label="修正内容">
                <Text value={task.modified} />
              </Field>
              <Field label="修正理由">
                <Text value={task.reason} />
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
                <Text value={task.memo} />
              </Field>
            </Stack>
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
    </Dialog>
  )
}

export default TaskDetailDialog
