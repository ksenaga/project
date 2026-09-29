import { useState, type SubmitEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import type { User, UserInput } from '../api/users'
import { ROLE, ROLE_LABEL } from '../constants/role'

const NAME_MAX_LENGTH = 50
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 72

type Props = {
  // 渡されたら編集、なければ新規作成
  target?: User
  // 権限を変更できるか(管理者が自分以外を編集・作成するとき)
  canChangeRole: boolean
  onClose: () => void
  onSubmit: (input: UserInput) => Promise<void>
}

const UserFormDialog = ({ target, canChangeRole, onClose, onSubmit }: Props) => {
  const isEdit = target !== undefined
  const [name, setName] = useState(target?.name ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<number>(target?.role ?? ROLE.MEMBER)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errors = {
    name:
      name.trim() === ''
        ? 'ユーザー名を入力してください'
        : name.trim().length > NAME_MAX_LENGTH
          ? `${NAME_MAX_LENGTH}文字以内で入力してください`
          : null,
    // 編集時は空なら変更しない
    password:
      (!isEdit || password !== '') &&
      (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH)
        ? `${PASSWORD_MIN_LENGTH}〜${PASSWORD_MAX_LENGTH}文字で入力してください`
        : null,
  }

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    if (errors.name || errors.password) return

    const input: UserInput = { name: name.trim() }
    if (password !== '') input.password = password
    if (canChangeRole) input.role = role

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
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isEdit ? 'ユーザーを編集' : 'ユーザーを登録'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="ユーザー名"
              required
              autoFocus
              fullWidth
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={submitted && errors.name !== null}
              helperText={
                (submitted && errors.name) || `${name.trim().length} / ${NAME_MAX_LENGTH}`
              }
              disabled={saving}
            />
            <TextField
              label="パスワード"
              type={showPassword ? 'text' : 'password'}
              required={!isEdit}
              fullWidth
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={submitted && errors.password !== null}
              helperText={
                (submitted && errors.password) ||
                (isEdit
                  ? '変更する場合のみ入力してください'
                  : `${PASSWORD_MIN_LENGTH}文字以上で入力してください`)
              }
              disabled={saving}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                        onClick={() => setShowPassword((v) => !v)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              label="権限"
              fullWidth
              value={role}
              onChange={(e) => setRole(Number(e.target.value))}
              disabled={saving || !canChangeRole}
              helperText={canChangeRole ? ' ' : '権限は変更できません'}
            >
              {Object.values(ROLE).map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving} color="inherit">
            キャンセル
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            {isEdit ? '保存' : '登録'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default UserFormDialog
