import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { BoardList } from '../../api/boardLists'
import type { Screen } from '../../api/screens'
import type { Tag, TagRef } from '../../api/tags'
import { ApiError } from '../../api/client'
import {
  TASK_UPDATED_BY_OTHERS,
  type Task,
  type TaskImage,
  type TaskInput,
  type TaskUpdateInput,
} from '../../api/tasks'
import type { Member } from '../../api/users'
import { CREATABLE_STATUSES, type TaskStatus } from '../../constants/taskStatus'
import type { LoginUser } from '../../pages/LoginPage'
import { isLimitedEditor, settableStatuses } from '../../utils/taskPermission'
import TagLabel from '../TagLabel'
import UserAvatar from '../UserAvatar'
import TaskImageEditor from './TaskImageEditor'

const TITLE_MAX_LENGTH = 50
const VARCHAR_MAX_LENGTH = 255

type Props = {
  user: LoginUser
  // 修正内容の画像を送る先のプロジェクト
  projectId: number
  // 担当者の候補(プロジェクトメンバー)
  members: Member[]
  // 画面名の候補(プロジェクトに登録されている画面名)
  screens: Screen[]
  // タグの候補
  tags: Tag[]
  // ボードのリスト(編集では、追加したリストも選べる)
  lists: BoardList[]
  // 渡されたら編集、なければ新規作成
  task?: Task
  // 渡されたらこのタスクの内容をコピーして新規作成する
  copyFrom?: Task
  // 新規作成時のステータス(押した列の「＋」)
  defaultStatus?: TaskStatus
  onClose: () => void
  onSubmit: (input: TaskUpdateInput) => Promise<void>
  // ほかの人が先に更新していたとき、最新の内容を開く(編集のみ)
  onOpenLatest?: () => void
}

const toNullable = (value: string) => (value.trim() === '' ? null : value.trim())

const TaskFormDialog = ({
  user,
  projectId,
  members,
  screens,
  lists,
  tags,
  task,
  copyFrom,
  defaultStatus,
  onClose,
  onSubmit,
  onOpenLatest,
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
  // タグ(0個以上)。コピーでも引き継ぐ
  const [selectedTags, setSelectedTags] = useState<TagRef[]>(source?.tags ?? [])
  const [assignees, setAssignees] = useState<Member[]>(
    task?.assignees ??
      (copyAssignees && copyAssignees.length > 0 ? copyAssignees : undefined) ??
      members.filter((m) => m.id === user.id),
  )
  const [status, setStatus] = useState<TaskStatus>(
    task?.status ?? copyStatus ?? defaultStatus ?? '未対応',
  )
  // 追加したリストに入っているとき(編集のみ)。null なら status のリスト
  const [listId, setListId] = useState<number | null>(task?.list_id ?? null)
  const customLists = isEdit ? lists.filter((list) => list.status === null) : []
  const [deadline, setDeadline] = useState(task?.deadline ?? '')
  // 画面名は必須。'' は未選択(以前の画面名なしのタスクを編集・コピーしたときも未選択になる)
  const [screenId, setScreenId] = useState<number | ''>(source?.screen?.id ?? '')
  const [modified, setModified] = useState(task?.modified ?? '')
  // 修正内容の画像(コピーでは引き継がない)。送っている途中は保存できない
  const [modifiedImages, setModifiedImages] = useState<TaskImage[]>(task?.modified_images ?? [])
  const [uploadingImages, setUploadingImages] = useState(0)
  const [reason, setReason] = useState(task?.reason ?? '')
  const [git, setGit] = useState(task?.git ?? '')
  const [memo, setMemo] = useState(task?.memo ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ほかの人が先に更新していた(このまま保存すると上書きしてしまうので、保存できないようにする)
  const [conflicted, setConflicted] = useState(false)
  // 保存ボタンは下にあるので、エラーが出たら上のエラー表示が見えるところまでスクロールする
  const errorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

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
      // 追加したリストは list_id、既存の5つは status で送る
      ...(listId !== null ? { list_id: listId } : { status }),
      modified: toNullable(modified),
      // 画像の一覧を読み込めていないタスク(詳細以外から開いた場合)では送らない(画像を消してしまわないように)
      ...((!isEdit || task.modified_images !== undefined) && {
        modified_image_ids: modifiedImages.map((image) => image.id),
      }),
      reason: toNullable(reason),
      git: toNullable(git),
      memo: toNullable(memo),
    }
    const fields: Partial<TaskInput> = limited
      ? common
      : {
          ...common,
          title: title.trim(),
          detail: detail.trim(),
          user_ids: assignees.map((a) => a.id),
          tag_ids: selectedTags.map((t) => t.id),
          deadline,
          screen_id: screenId as number,
        }

    // 編集では、編集を始めたときの更新日時を送る(ほかの人が先に更新していたら保存されない)
    const input: TaskUpdateInput = isEdit
      ? { ...fields, expected_updated_at: task.updated_at }
      : fields

    setSaving(true)
    setError(null)
    try {
      await onSubmit(input)
    } catch (err) {
      if (err instanceof ApiError && err.code === TASK_UPDATED_BY_OTHERS) setConflicted(true)
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
            {error && (
              <Alert
                ref={errorRef}
                severity={conflicted ? 'warning' : 'error'}
                action={
                  conflicted && onOpenLatest ? (
                    <Button color="inherit" size="small" onClick={onOpenLatest}>
                      最新の内容を開く
                    </Button>
                  ) : undefined
                }
              >
                {error}
              </Alert>
            )}
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
                value={listId !== null ? `list:${listId}` : status}
                onChange={(e) => {
                  const value = e.target.value
                  if (value.startsWith('list:')) {
                    setListId(Number(value.slice('list:'.length)))
                  } else {
                    setListId(null)
                    setStatus(value as TaskStatus)
                  }
                }}
                disabled={saving}
              >
                {displayedStatuses.map((s) => (
                  <MenuItem
                    key={s}
                    value={s}
                    disabled={listId === null && !statusOptions.includes(s)}
                  >
                    {s}
                  </MenuItem>
                ))}
                {customLists.map((list) => (
                  <MenuItem key={list.id} value={`list:${list.id}`}>
                    {list.name}
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
            {/* タグ(複数選択) */}
            <Autocomplete
              multiple
              options={tags as TagRef[]}
              value={selectedTags}
              onChange={(_e, value) => setSelectedTags(value)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterSelectedOptions
              disableCloseOnSelect
              readOnly={limited}
              disabled={saving}
              renderOption={({ key, ...props }, option) => (
                <li key={key} {...props}>
                  <Box sx={{ width: 84, flexShrink: 0 }}>
                    <TagLabel tag={option} size="medium" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {tags.find((tag) => tag.id === option.id)?.description}
                  </Typography>
                </li>
              )}
              renderValue={(value, getItemProps) =>
                value.map((option, index) => {
                  const { key, ...itemProps } = getItemProps({ index })
                  return (
                    <Chip
                      key={key}
                      {...itemProps}
                      label={option.name}
                      size="small"
                      sx={{
                        bgcolor: option.color,
                        color: option.text_color,
                        fontWeight: 700,
                        '& .MuiChip-deleteIcon': { color: option.text_color, opacity: 0.7 },
                      }}
                    />
                  )
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="タグ"
                  placeholder={
                    limited
                      ? undefined
                      : selectedTags.length === 0
                        ? 'クリックしてタグを追加'
                        : '追加'
                  }
                  helperText={limited ? ' ' : '複数選べます'}
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
              {/* 修正内容には、原因となる画面のスクリーンショットなどを貼り付けられる */}
              <TaskImageEditor
                projectId={projectId}
                images={modifiedImages}
                onChange={setModifiedImages}
                onUploadingChange={setUploadingImages}
                disabled={saving}
              >
                <TextField
                  label="修正内容"
                  fullWidth
                  multiline
                  minRows={3}
                  value={modified}
                  onChange={(e) => setModified(e.target.value)}
                  disabled={saving}
                />
              </TaskImageEditor>
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
          <Button
            type="submit"
            variant="contained"
            loading={saving}
            // 画像を送っている途中は、送り終わるまで保存できない
            disabled={conflicted || uploadingImages > 0}
          >
            {isEdit ? '保存' : '作成'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default TaskFormDialog
