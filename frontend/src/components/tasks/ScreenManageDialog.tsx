import { useEffect, useState, type SubmitEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  createScreen,
  deleteScreen,
  fetchScreens,
  updateScreen,
  type Screen,
} from '../../api/screens'
import { CancelIconButton, SaveIconButton } from '../ActionIconButtons'

const NAME_MAX_LENGTH = 50

type Props = {
  projectId: number
  onClose: () => void
  // 追加・編集・削除したとき(ボードの画面名とタスクを取り直す)
  onChanged: () => void
}

// 画面名の追加・編集・削除。タスクで使われている画面名は削除できない
const ScreenManageDialog = ({ projectId, onClose, onChanged }: Props) => {
  const [screens, setScreens] = useState<Screen[] | null>(null)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    fetchScreens(projectId)
      .then((data) => !ignore && setScreens(data))
      .catch((err: unknown) => !ignore && setError((err as Error).message))
    return () => {
      ignore = true
    }
  }, [projectId, reloadKey])

  // 変更を実行し、成功したら一覧を取り直す
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      setReloadKey((k) => k + 1)
      onChanged()
      return true
    } catch (err) {
      setError((err as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = newName.trim()
    if (name === '') return
    if (await run(() => createScreen(projectId, name))) setNewName('')
  }

  const handleSaveEdit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editing || editing.name.trim() === '') return
    const { id, name } = editing
    if (await run(() => updateScreen(projectId, id, name.trim()))) setEditing(null)
  }

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      // タスク詳細と同じ横幅
      maxWidth="lg"
      slotProps={{ paper: { sx: { px: 1 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.375rem', pt: 3 }}>画面名の管理</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2.5} sx={{ flexGrow: 1, minHeight: 0 }}>
          <Typography variant="body2" color="text.secondary">
            タスクの画面名は、ここで登録したものから選びます。タスクで使われている画面名は削除できません。
          </Typography>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack component="form" direction="row" spacing={1} onSubmit={handleAdd} noValidate>
            <TextField
              label="画面名を追加"
              placeholder="例: ログイン画面"
              fullWidth
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={busy}
              slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={busy || newName.trim() === ''}
              sx={{ flexShrink: 0 }}
            >
              追加
            </Button>
          </Stack>

          {screens === null && !error && (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {screens?.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              画面名はまだ登録されていません
            </Typography>
          )}
          {screens && screens.length > 0 && (
            // 行の高さは中身に合わせ、画面名が多いときは一覧だけスクロールする
            <Paper variant="outlined" sx={{ minHeight: 0, overflowY: 'auto' }}>
              <List disablePadding aria-label="登録されている画面名">
                {screens.map((screen, i) => (
                  <ListItem
                    key={screen.id}
                    divider={i < screens.length - 1}
                    sx={{ py: 1.5, px: 2.5 }}
                  >
                    {editing?.id === screen.id ? (
                      <Stack
                        component="form"
                        direction="row"
                        spacing={1}
                        onSubmit={handleSaveEdit}
                        noValidate
                        sx={{ width: '100%', alignItems: 'center' }}
                      >
                        {/* 入力欄は残りの幅に収め、ボタンが折り返さないようにする */}
                        <TextField
                          size="small"
                          autoFocus
                          sx={{ flex: '1 1 auto', minWidth: 0, maxWidth: 480 }}
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          onKeyDown={(e) =>
                            e.key === 'Escape' && (e.stopPropagation(), setEditing(null))
                          }
                          disabled={busy}
                          slotProps={{
                            htmlInput: { maxLength: NAME_MAX_LENGTH, 'aria-label': '画面名' },
                          }}
                        />
                        <SaveIconButton type="submit" size="small" disabled={busy} />
                        <CancelIconButton
                          size="small"
                          onClick={() => setEditing(null)}
                          disabled={busy}
                        />
                      </Stack>
                    ) : (
                      <>
                        <Typography sx={{ flexGrow: 1, wordBreak: 'break-word' }}>
                          {screen.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mx: 2 }}>
                          タスク {screen.task_count} 件
                        </Typography>
                        <Tooltip title="編集">
                          <IconButton
                            aria-label={`${screen.name}を編集`}
                            onClick={() => setEditing({ id: screen.id, name: screen.name })}
                            disabled={busy}
                          >
                            <EditOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            screen.task_count > 0
                              ? 'タスクで使われているため削除できません'
                              : '削除'
                          }
                        >
                          {/* 無効なボタンでもツールチップを出すため span で包む */}
                          <span>
                            <IconButton
                              aria-label={`${screen.name}を削除`}
                              onClick={() => run(() => deleteScreen(projectId, screen.id))}
                              disabled={busy || screen.task_count > 0}
                            >
                              <DeleteOutlinedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ScreenManageDialog
