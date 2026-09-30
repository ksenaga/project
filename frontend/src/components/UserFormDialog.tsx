import { useEffect, useRef, useState, type SubmitEvent } from 'react'
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
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import type { UserInput, UserSummary } from '../api/users'
import { ROLE, ROLE_LABEL } from '../constants/role'
import { toAvatarImage } from '../utils/avatarImage'
import UserAvatar from './UserAvatar'
import { CancelIconButton, SaveIconButton } from './ActionIconButtons'

const NAME_MAX_LENGTH = 50
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 72

// アイコン画像をどうするか(保存したときに反映する)。preview は選んだ画像を表示するための URL
export type AvatarChange =
  { type: 'keep' } | { type: 'set'; image: Blob; preview: string } | { type: 'remove' }

type Props = {
  // 渡されたら編集、なければ新規作成
  target?: Omit<UserSummary, 'project_count'>
  // 権限を変更できるか(管理者が自分以外を編集・作成するとき)
  canChangeRole: boolean
  onClose: () => void
  onSubmit: (input: UserInput, avatar: AvatarChange) => Promise<void>
  // ロックを解除する(管理者が、ロックされたユーザーを編集するときだけ渡す)
  onUnlock?: () => Promise<void>
}

const UserFormDialog = ({ target, canChangeRole, onClose, onSubmit, onUnlock }: Props) => {
  const isEdit = target !== undefined
  const [avatar, setAvatar] = useState<AvatarChange>({ type: 'keep' })
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // 選び直したとき・閉じたときに、選んだ画像の表示用 URL を解放する
  useEffect(
    () => () => {
      if (avatar.type === 'set') URL.revokeObjectURL(avatar.preview)
    },
    [avatar],
  )
  // 保存する前でも、選んだ画像(外したときは頭文字)で見た目を確認できる
  const avatarUrl =
    avatar.type === 'set'
      ? avatar.preview
      : avatar.type === 'remove'
        ? null
        : (target?.avatar_url ?? null)
  const [unlocking, setUnlocking] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
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
      await onSubmit(input, avatar)
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
            {target?.locked && onUnlock && (
              <Alert
                severity={unlocked ? 'success' : 'warning'}
                action={
                  !unlocked && (
                    <Button
                      color="inherit"
                      size="small"
                      loading={unlocking}
                      onClick={async () => {
                        setUnlocking(true)
                        try {
                          await onUnlock()
                          setUnlocked(true)
                        } catch (err) {
                          setError((err as Error).message)
                        } finally {
                          setUnlocking(false)
                        }
                      }}
                    >
                      ロックを解除
                    </Button>
                  )
                }
              >
                {unlocked
                  ? 'ロックを解除しました。ログインできます'
                  : 'ログインに続けて失敗したため、ロックされています（パスワードを設定し直しても解除されます）'}
              </Alert>
            )}
            {/* アイコン画像。選んだ画像は中央で正方形に切り抜いて縮める */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <UserAvatar
                user={{ id: target?.id ?? 0, name: name.trim() || '?', avatar_url: avatarUrl }}
                size={72}
              />
              <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddPhotoAlternateOutlinedIcon />}
                    onClick={() => fileRef.current?.click()}
                    disabled={saving}
                  >
                    画像を選ぶ
                  </Button>
                  {avatarUrl && (
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() =>
                        setAvatar(target?.avatar_url ? { type: 'remove' } : { type: 'keep' })
                      }
                      disabled={saving}
                    >
                      画像を外す
                    </Button>
                  )}
                </Stack>
                <Box
                  component="span"
                  sx={{
                    typography: 'caption',
                    color: avatarError ? 'error.main' : 'text.secondary',
                  }}
                >
                  {avatarError ?? 'アイコンに使う画像（正方形に切り抜きます）'}
                </Box>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  aria-label="アイコン画像"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    setAvatarError(null)
                    try {
                      const image = await toAvatarImage(file)
                      setAvatar({ type: 'set', image, preview: URL.createObjectURL(image) })
                    } catch (err) {
                      setAvatarError((err as Error).message)
                    }
                  }}
                />
              </Stack>
            </Stack>
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
          <CancelIconButton onClick={onClose} disabled={saving} />
          {isEdit ? (
            <SaveIconButton type="submit" loading={saving} />
          ) : (
            <Button type="submit" variant="contained" loading={saving}>
              登録
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default UserFormDialog
