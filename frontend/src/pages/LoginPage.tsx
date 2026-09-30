import { useState, type SubmitEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export type LoginUser = {
  id: number
  name: string
  role: number
  // アイコン画像の URL(画像がなければ null)
  avatar_url?: string | null
}

type Props = {
  onLoginSuccess?: (user: LoginUser) => void
}

const LoginPage = ({ onLoginSuccess }: Props) => {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState({ name: false, password: false })

  const nameError = touched.name && name.trim() === ''
  const passwordError = touched.password && password === ''

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTouched({ name: true, password: true })
    if (name.trim() === '' || password === '') return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), password }),
      })
      if (!res.ok) {
        // 423: 続けて失敗したためロック中(あと何分かはサーバーのメッセージに入っている)
        if (res.status === 423) {
          const data: { message?: string } | null = await res.json().catch(() => null)
          throw new Error(data?.message ?? 'ロックされています。時間をおいて再度お試しください')
        }
        throw new Error(
          res.status === 401
            ? 'ユーザー名またはパスワードが正しくありません'
            : 'ログインに失敗しました。時間をおいて再度お試しください',
        )
      }
      const user: LoginUser = await res.json()
      onLoginSuccess?.(user)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'サーバーに接続できませんでした'
          : (err as Error).message,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100%',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        bgcolor: 'background.default',
      }}
    >
      {/* ブランドパネル（md以上で表示） */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: 'common.white',
          background:
            'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #0ea5e9 100%)',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.12), transparent 45%)',
          }}
        />
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', position: 'relative' }}>
          <TaskAltIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Task Manager
          </Typography>
        </Stack>
      </Box>

      {/* フォーム */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 420,
            p: { xs: 3, sm: 5 },
            border: 1,
            borderColor: 'divider',
            boxShadow: '0 10px 40px -12px rgba(15, 23, 42, 0.15)',
          }}
        >
          <Stack spacing={1} sx={{ mb: 4 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                mb: 1,
              }}
            >
              <LockOutlinedIcon />
            </Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              ログイン
            </Typography>
            <Typography variant="body2" color="text.secondary">
              アカウント情報を入力してください
            </Typography>
          </Stack>

          <Box component="form" noValidate onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              <TextField
                label="ユーザー名"
                autoComplete="username"
                autoFocus
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                error={nameError}
                helperText={nameError ? 'ユーザー名を入力してください' : ' '}
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="パスワード"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={passwordError}
                helperText={passwordError ? 'パスワードを入力してください' : ' '}
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
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
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                loading={loading}
                sx={{ py: 1.5 }}
              >
                ログイン
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

export default LoginPage
