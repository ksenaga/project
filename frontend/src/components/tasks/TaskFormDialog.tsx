import { useState, type SubmitEvent } from 'react'
import {
  Alert,
  Autocomplete,
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
import type { Screen } from '../../api/screens'
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
  // 画面名の候補(プロジェクトに登録されている画面名)
  screens: Screen[]
  // 渡されたら編集、なければ新規作成
  task?: Task
  // 渡されたらこのタスクの内容をコピーして新規作成する
  copyFrom?: Task
  // 新規作成時のステータス(押した列の「＋」)
  defaultStatus?: TaskStatus
  onClose: () => void
  onSubmit: (input: Partial<TaskInput>) => Promise<void>
}

const toNullable = (value: string) => (value.trim() === '' ? null : value.trim())

const TaskFormDialog = ({
  user,
  members,
  screens,
  task,
  copyFrom,
  defaultStatus,
  onClose,
  onSubmit,
}: Props) => {
  const isEdit = task !== undefined
  // コピーでは Git URL・期限・修正内容・修正理由・メモは引き継がない
  const source = task ?? copyFrom
  const copyStatus =
    copyFrom && CREATABLE_STATUSES.includes(copyFrom.status) ? copyFrom.status : undefined
  // コピーでは、今もプロジェクトメンバーの担当者だけ引き継ぐ
  const copyAssignees = copyFrom?.assignees.filter((a) => members.some((m) => m.id === a.id))
  // 一般ユーザーが編集するときは、ステータス・修正内容・修正理由・Git URL・メモだけ変更できる
  const limited = isEdit && isLimitedEditor(user)

  const [title, setTitle] = useState(source?.title ?? '')
  const [detail, setDetail] = useState(source?.detail ?? '')
  // 担当者(複数)。新規作成では、自分がメンバーなら自分を初期値にする
  const [assignees, setAssignees] = useState<Member[]>(
    task?.assignees ??
      (copyAssignees && copyAssignees.length > 0 ? copyAssignees : undefined) ??
      members.filter((m) => m.id === user.id),
  )
  const [status, setStatus] = useState<TaskStatus>(
    task?.status ?? copyStatus ?? defaultStatus ?? '未対応',
  )
  const [deadline, setDeadline] = useState(task?.deadline ?? '')
  // 画面名は必須。'' は未選択(以前の画面名なしのタスクを編集・コピーしたときも未選択になる)
  const [screenId, setScreenId] = useState<number | ''>(source?.screen?.id ?? '')
  const [modified, setModified] = useState(task?.modified ?? '')
  const [reason, setReason] = useState(task?.reason ?? '')
  const [git, setGit] = useState(task?.git ?? '')
  const [memo, setMemo] = useState(task?.memo ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 担当者がメンバーから外れていても、現在の担当者は選択肢に残す
  const assigneeOptions = [
    ...members,
    ...(task?.assignees.filter((a) => !members.some((m) => m.id === a.id)) ?? []),
  ]

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
    assignees: assignees.length === 0 ? '担当者を1人以上選んでください' : null,
    deadline: deadline === '' ? '期限を入力してください' : null,
    screenId: screenId === '' ? '画面名を選んでください' : null,
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
          user_ids: assignees.map((a) => a.id),
          deadline,
          screen_id: screenId as number,
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
          {isEdit ? 'タスクを編集' : copyFrom ? 'タスクのコピーを作成' : 'タスクを作成'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {copyFrom && (
              <Alert severity="info">
                「{copyFrom.title}」の内容をコピーしました。Git
                URL・期限・修正内容・修正理由・メモは空になっています
              </Alert>
            )}
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
            {/* 1行目: ステータス・期限・画面名 */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
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
                select
                label="画面名"
                required
                value={screenId}
                onChange={(e) => setScreenId(Number(e.target.value))}
                error={show('screenId') !== null}
                helperText={
                  show('screenId') ??
                  (screens.length === 0 ? '先に「画面名の管理」で登録してください' : ' ')
                }
                disabled={saving || limited}
              >
                {screens.length === 0 && (
                  <MenuItem value="" disabled>
                    画面名が登録されていません
                  </MenuItem>
                )}
                {screens.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            {/* 2行目: 担当者(複数選択) */}
            <Autocomplete
              multiple
              options={assigneeOptions}
              value={assignees}
              onChange={(_e, value) => setAssignees(value)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterSelectedOptions
              disableCloseOnSelect
              readOnly={limited}
              disabled={saving}
              noOptionsText={
                members.length === 0
                  ? 'プロジェクトにメンバーがいません'
                  : '追加できるメンバーがいません'
              }
              renderOption={({ key, ...props }, option) => (
                <li key={key} {...props}>
                  <UserAvatar user={option} size={22} sx={{ mr: 1 }} />
                  {option.name}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="担当者"
                  required
                  placeholder={
                    limited
                      ? undefined
                      : assignees.length === 0
                        ? 'クリックして担当者を追加'
                        : '追加'
                  }
                  error={show('assignees') !== null}
                  helperText={
                    show('assignees') ?? (limited ? ' ' : 'プロジェクトメンバーから複数人選べます')
                  }
                />
              )}
            />
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
