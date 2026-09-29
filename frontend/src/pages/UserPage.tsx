import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import { ApiError } from '../api/client'
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
  type User,
  type UserInput,
  type UserSummary,
} from '../api/users'
import { useAuth } from '../auth/AuthContext'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import UserAvatar from '../components/UserAvatar'
import UserDetailDialog from '../components/UserDetailDialog'
import UserFormDialog from '../components/UserFormDialog'
import { ROLE, ROLE_LABEL } from '../constants/role'

type DialogState =
  | { type: 'detail'; userId: number }
  | { type: 'create' }
  | { type: 'edit'; target: User }
  | { type: 'delete'; target: User }
  | null

const UserPage = () => {
  const { user, setUser } = useAuth()
  const isAdmin = user?.role === ROLE.ADMIN

  const [users, setUsers] = useState<UserSummary[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // 管理者は全員、それ以外は自分だけ編集できる。削除は管理者が自分以外に対してのみ
  const canEdit = (target: User) => isAdmin || target.id === user?.id
  const canDelete = (target: User) => isAdmin && target.id !== user?.id

  // 401(ログイン切れ)ならログイン画面に戻す
  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) setUser(null)
    },
    [setUser],
  )

  // 値を増やすと一覧を取り直す
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let ignore = false
    fetchUsers()
      .then((data) => {
        if (ignore) return
        setUsers(data)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (ignore) return
        handleAuthError(err)
        setLoadError((err as Error).message)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey, handleAuthError])

  const handleSubmit = async (input: UserInput) => {
    try {
      if (dialog?.type === 'edit') {
        const updated = await updateUser(dialog.target.id, input)
        // 自分の名前を変えたらヘッダーの表示も更新する
        if (updated.id === user?.id) {
          setUser({ id: updated.id, name: updated.name, role: updated.role })
        }
        setNotice('ユーザーを更新しました')
      } else {
        await createUser(input)
        setNotice('ユーザーを登録しました')
      }
    } catch (err) {
      handleAuthError(err)
      throw err
    }
    setDialog(null)
    reload()
  }

  const handleDelete = async () => {
    if (dialog?.type !== 'delete') return
    try {
      await deleteUser(dialog.target.id)
    } catch (err) {
      handleAuthError(err)
      throw err
    }
    setDialog(null)
    setNotice('ユーザーを削除しました')
    reload()
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 3 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            ユーザー一覧
          </Typography>
          {users && (
            <Typography variant="body2" color="text.secondary">
              {users.length} 人
            </Typography>
          )}
        </Box>
        {isAdmin && (
          <Tooltip title="ユーザーを登録">
            <IconButton
              aria-label="ユーザーを登録"
              onClick={() => setDialog({ type: 'create' })}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {loadError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              再読み込み
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {loadError}
        </Alert>
      )}

      {users === null && !loadError && (
        <Stack spacing={2}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={88} />
          ))}
        </Stack>
      )}

      {users && users.length > 0 && (
        <Stack spacing={2}>
          {users.map((target) => (
            <Paper
              key={target.id}
              variant="outlined"
              onClick={() => setDialog({ type: 'detail', userId: target.id })}
              sx={{
                p: 2.5,
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 4px 16px -8px rgba(79, 70, 229, 0.4)',
                },
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <UserAvatar user={target} size={44} />
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography
                      variant="h6"
                      component="h2"
                      sx={{ fontWeight: 700, wordBreak: 'break-word' }}
                    >
                      {/* キーボード操作でも詳細を開けるようにボタンにする */}
                      <Box
                        component="button"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDialog({ type: 'detail', userId: target.id })
                        }}
                        sx={{
                          all: 'inherit',
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                          '&:focus-visible': { outline: 2, outlineColor: 'primary.main' },
                        }}
                      >
                        {target.name}
                      </Box>
                    </Typography>
                    {target.id === user?.id && <Chip label="あなた" size="small" color="primary" />}
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: 'center', mt: 0.5, color: 'text.secondary' }}
                  >
                    <Typography variant="body2">{ROLE_LABEL[target.role] ?? '不明'}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <FolderOutlinedIcon sx={{ fontSize: 18 }} />
                      <Typography variant="body2">
                        参画プロジェクト {target.project_count} 件
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
                <Stack direction="row" onClick={(e) => e.stopPropagation()}>
                  {canEdit(target) && (
                    <Tooltip title="編集">
                      <IconButton
                        aria-label={`${target.name}を編集`}
                        onClick={() => setDialog({ type: 'edit', target })}
                      >
                        <EditOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDelete(target) && (
                    <Tooltip title="削除">
                      <IconButton
                        aria-label={`${target.name}を削除`}
                        onClick={() => setDialog({ type: 'delete', target })}
                      >
                        <DeleteOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {dialog?.type === 'detail' && (
        <UserDetailDialog
          userId={dialog.userId}
          canEdit={isAdmin || dialog.userId === user?.id}
          canOpenProjects={isAdmin || dialog.userId === user?.id}
          onClose={() => setDialog(null)}
          onEdit={(target) => setDialog({ type: 'edit', target })}
        />
      )}
      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <UserFormDialog
          target={dialog.type === 'edit' ? dialog.target : undefined}
          canChangeRole={isAdmin && (dialog.type === 'create' || dialog.target.id !== user?.id)}
          onClose={() => setDialog(null)}
          onSubmit={handleSubmit}
        />
      )}
      {dialog?.type === 'delete' && (
        <ConfirmDeleteDialog
          title="ユーザーを削除"
          message={`「${dialog.target.name}」を削除しますか？参画しているプロジェクトからも外れます。`}
          onClose={() => setDialog(null)}
          onConfirm={handleDelete}
        />
      )}

      <Snackbar
        open={notice !== null}
        autoHideDuration={3000}
        onClose={() => setNotice(null)}
        message={notice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  )
}

export default UserPage
