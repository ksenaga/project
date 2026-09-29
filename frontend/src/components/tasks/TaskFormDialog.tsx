import { useState, type SubmitEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import type { Task, TaskInput } from '../../api/tasks'
import type { Member } from '../../api/users'
import { CREATABLE_STATUSES, type TaskStatus } from '../../constants/taskStatus'
import type { LoginUser } from '../../pages/LoginPage'
import { isLimitedEditor, settableStatuses } from '../../utils/taskPermission'
import UserAvatar from '../UserAvatar'

const TITLE_MAX_LENGTH = 50
const VARCHAR_MAX_LENGTH = 255

type Props = {
  user: LoginUser
  // 担当者の候補(プロジェクトメンバー)
  members: Member[]
  // 渡されたら編集、なければ新規作成
  task?: Task
  // 新規作成時のステータス(押した列の「＋」)
  defaultStatus?: TaskStatus
  onClose: () => void
  onSubmit: (input: Partial<TaskInput>) => Promise<void>
}

const toNullable = (value: string) => (value.trim() === '' ? null : value.trim())

const TaskFormDialog = ({ user, members, task, defaultStatus, onClose, onSubmit }: Props) => {
  const isEdit = task !== undefined
  // 一般ユーザーが編集するときは、ステータス・修正内容・修正理由・Git URL・メモだけ変更できる
  const limited = isEdit && isLimitedEditor(user)

  const [title, setTitle] = useState(task?.title ?? '')
  const [detail, setDetail] = useState(task?.detail ?? '')
  const [userId, setUserId] = useState<number | ''>(
    task?.assignee.id ?? (members.some((m) => m.id === user.id) ? user.id : ''),
  )
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus ?? '未対応')
  const [deadline, setDeadline] = useState(task?.deadline ?? '')
  const [screen, setScreen] = useState(task?.screen ?? '')
  const [modified, setModified] = useState(task?.modified ?? '')
  const [reason, setReason] = useState(task?.reason ?? '')
  const [git, setGit] = useState(task?.git ?? '')
  const [memo, setMemo] = useState(task?.memo ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 担当者がメンバーから外れていても、現在の担当者は選択肢に残す
  const assigneeOptions =
    task && !members.some((m) => m.id === task.assignee.id) ? [...members, task.assignee] : members

  // 選べるステータス(新規作成は未対応・対応中のみ)。現在のステータスが選べないものでも表示のために残す
  const statusOptions = isEdit ? settableStatuses(user) : CREATABLE_STATUSES
  const displayedStatuses = statusOptions.includes(status)
    ? statusOptions
    : [status, ...statusOptions]

  const errors = {
    title:
      title.trim() === ''
        ? 'タイトルを入力してください'
        : title.trim().length > TITLE_MAX_LENGTH
          ? `${TITLE_MAX_LENGTH}文字以内で入力してください`
          : null,
    detail: detail.trim() === '' ? '説明を入力してください' : null,
    userId: userId === '' ? '担当者を選んでください' : null,
    deadline: deadline === '' ? '期限を入力してください' : null,
    screen:
      screen.trim().length > VARCHAR_MAX_LENGTH
        ? `${VARCHAR_MAX_LENGTH}文字以内で入力してください`
        : null,
    git:
      git.trim().length > VARCHAR_MAX_LENGTH
        ? `${VARCHAR_MAX_LENGTH}文字以内で入力してください`
        : null,
  }
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : null)

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    const editable = limited ? (['git'] as const) : (Object.keys(errors) as (keyof typeof errors)[])
    if (editable.some((key) => errors[key])) return

    const common = {
      status,
      modified: toNullable(modified),
      reason: toNullable(reason),
      git: toNullable(git),
      memo: toNullable(memo),
    }
    const input: Partial<TaskInput> = limited
      ? common
      : {
          ...common,
          title: title.trim(),
          detail: detail.trim(),
          user_id: userId as number,
          deadline,
          screen: toNullable(screen),
        }

    setSaving(true)
    setError(null)
    try {
      await onSubmit(input)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isEdit ? 'タスクを編集' : 'タスクを作成'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {limited && (
              <Alert severity="info">
                一般ユーザーが変更できるのは、ステータス（未対応・対応中・レビュー中）・修正内容・修正理由・Git
                URL・メモです
              </Alert>
            )}
            <TextField
              label="タイトル"
              required
              autoFocus={!limited}
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={show('title') !== null}
              helperText={show('title') ?? `${title.trim().length} / ${TITLE_MAX_LENGTH}`}
              disabled={saving || limited}
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                gap: 2,
              }}
            >
              <TextField
                select
                label="ステータス"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={saving}
              >
                {displayedStatuses.map((s) => (
                  <MenuItem key={s} value={s} disabled={!statusOptions.includes(s)}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="担当者"
                required
                value={userId}
                onChange={(e) => setUserId(Number(e.target.value))}
                error={show('userId') !== null}
                helperText={
                  show('userId') ??
                  (members.length === 0 ? 'プロジェクトにメンバーがいません' : ' ')
                }
                disabled={saving || limited}
              >
                {assigneeOptions.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <UserAvatar user={m} size={22} />
                      <span>{m.name}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="期限"
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                error={show('deadline') !== null}
                helperText={show('deadline') ?? ' '}
                disabled={saving || limited}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="画面名"
                value={screen}
                onChange={(e) => setScreen(e.target.value)}
                error={show('screen') !== null}
                helperText={show('screen') ?? ' '}
                disabled={saving || limited}
              />
            </Box>
            <TextField
              label="説明"
              required
              fullWidth
              multiline
              minRows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              error={show('detail') !== null}
              helperText={show('detail') ?? ' '}
              disabled={saving || limited}
            />
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}
            >
              <TextField
                label="修正内容"
                multiline
                minRows={3}
                value={modified}
                onChange={(e) => setModified(e.target.value)}
                disabled={saving}
              />
              <TextField
                label="修正理由"
                multiline
                minRows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={saving}
              />
            </Box>
            <TextField
              label="Git URL"
              fullWidth
              placeholder="https://github.com/..."
              value={git}
              onChange={(e) => setGit(e.target.value)}
              error={show('git') !== null}
              helperText={show('git') ?? ' '}
              disabled={saving}
            />
            <TextField
              label="メモ"
              fullWidth
              multiline
              minRows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={saving}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving} color="inherit">
            キャンセル
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            {isEdit ? '保存' : '作成'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default TaskFormDialog
