import { useEffect, useState, type SubmitEvent } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { Project, ProjectInput } from '../api/projects'
import { fetchUsers, type Member, type User } from '../api/users'
import { ROLE_LABEL } from '../constants/role'
import ProjectHistory from './ProjectHistory'
import UserAvatar from './UserAvatar'
import { CancelIconButton, SaveIconButton } from './ActionIconButtons'

const NAME_MAX_LENGTH = 50

type Props = {
  // 渡されたら編集、なければ新規作成
  project?: Project
  // true なら閲覧のみ(管理者以外が詳細を見るとき)
  readOnly?: boolean
  onClose: () => void
  onSubmit: (input: ProjectInput) => Promise<void>
}

const ProjectFormDialog = ({ project, readOnly = false, onClose, onSubmit }: Props) => {
  const isEdit = project !== undefined
  // 閲覧のみのときは入力欄を読み取り専用にする(disabled より文字が読みやすい)
  const readOnlyInput = readOnly ? { readOnly: true } : undefined
  const [name, setName] = useState(project?.name ?? '')
  const [detail, setDetail] = useState(project?.detail ?? '')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [members, setMembers] = useState<Member[]>(project?.members ?? [])
  const [users, setUsers] = useState<User[] | null>(null)
  const [touched, setTouched] = useState({ name: false, detail: false, deadline: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // メンバーの候補
  useEffect(() => {
    if (readOnly) return
    let ignore = false
    fetchUsers()
      .then((data) => !ignore && setUsers(data))
      .catch((err: unknown) => {
        if (ignore) return
        setUsers([])
        setError((err as Error).message)
      })
    return () => {
      ignore = true
    }
  }, [readOnly])

  const nameError = (touched.name && name.trim() === '') || name.trim().length > NAME_MAX_LENGTH
  const detailError = touched.detail && detail.trim() === ''
  const deadlineError = touched.deadline && deadline === ''

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTouched({ name: true, detail: true, deadline: true })
    if (
      name.trim() === '' ||
      name.trim().length > NAME_MAX_LENGTH ||
      detail.trim() === '' ||
      deadline === ''
    ) {
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        detail: detail.trim(),
        deadline,
        member_ids: members.map((m) => m.id),
      })
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {readOnly ? 'プロジェクトの詳細' : isEdit ? 'プロジェクトを編集' : 'プロジェクトを作成'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {readOnly && (
              <Alert severity="info">
                プロジェクトの編集は、管理者と、参画しているリーダーのみできます
              </Alert>
            )}
            <TextField
              label="プロジェクト名"
              required={!readOnly}
              autoFocus={!readOnly}
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              error={nameError}
              helperText={
                readOnly
                  ? ' '
                  : nameError && name.trim() === ''
                    ? 'プロジェクト名を入力してください'
                    : `${name.trim().length} / ${NAME_MAX_LENGTH}`
              }
              disabled={saving}
              slotProps={{ input: readOnlyInput }}
            />
            <TextField
              label="プロジェクト詳細"
              required={!readOnly}
              fullWidth
              multiline
              minRows={4}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, detail: true }))}
              error={detailError}
              helperText={detailError ? 'プロジェクト詳細を入力してください' : ' '}
              disabled={saving}
              slotProps={{ input: readOnlyInput }}
            />
            <TextField
              label="期限"
              type="date"
              required={!readOnly}
              fullWidth
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, deadline: true }))}
              error={deadlineError}
              helperText={deadlineError ? '期限を入力してください' : ' '}
              disabled={saving}
              slotProps={{ inputLabel: { shrink: true }, input: readOnlyInput }}
            />
            <Autocomplete
              multiple
              options={users ?? []}
              loading={users === null}
              value={members}
              onChange={(_e, value) => setMembers(value)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterSelectedOptions
              disableCloseOnSelect
              readOnly={readOnly}
              disabled={saving}
              noOptionsText="追加できるユーザーがいません"
              loadingText="読み込み中…"
              renderOption={({ key, ...props }, option) => (
                <li key={key} {...props}>
                  <UserAvatar user={option} size={24} sx={{ mr: 1.5 }} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {option.name}
                  </Typography>
                  {'role' in option && (
                    <Typography variant="caption" color="text.secondary">
                      {ROLE_LABEL[(option as User).role]}
                    </Typography>
                  )}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="メンバー"
                  placeholder={
                    readOnly
                      ? members.length === 0
                        ? 'メンバー未設定'
                        : undefined
                      : members.length === 0
                        ? 'クリックしてメンバーを追加'
                        : '追加'
                  }
                  helperText={readOnly ? ' ' : 'クリックで追加・名前で検索できます'}
                />
              )}
            />
            {/* 作成済みのプロジェクトは、メンバーの下に変更履歴(閉じた状態で表示し、開いたら読み込む) */}
            {project && <ProjectHistory projectId={project.id} />}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {readOnly ? (
            <Button onClick={onClose} color="inherit">
              閉じる
            </Button>
          ) : (
            <>
              <CancelIconButton onClick={onClose} disabled={saving} />
              {isEdit ? (
                <SaveIconButton type="submit" loading={saving} />
              ) : (
                <Button type="submit" variant="contained" loading={saving}>
                  作成
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default ProjectFormDialog
