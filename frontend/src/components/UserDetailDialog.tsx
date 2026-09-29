import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import { Link as RouterLink } from 'react-router'
import { fetchUser, type UserDetail } from '../api/users'
import { ROLE_LABEL } from '../constants/role'
import UserAvatar from './UserAvatar'

type Props = {
  userId: number
  canEdit: boolean
  // プロジェクト名からタスク一覧へ移動できるか(管理者か本人のとき)
  canOpenProjects: boolean
  onClose: () => void
  onEdit: (user: UserDetail) => void
}

const UserDetailDialog = ({ userId, canEdit, canOpenProjects, onClose, onEdit }: Props) => {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchUser(userId)
      .then((data) => !ignore && setUser(data))
      .catch((err: unknown) => !ignore && setError((err as Error).message))
    return () => {
      ignore = true
    }
  }, [userId])

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {!user && !error && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {user && (
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <UserAvatar user={user} size={56} />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{ fontWeight: 700, wordBreak: 'break-word' }}
                >
                  {user.name}
                </Typography>
                <Chip label={ROLE_LABEL[user.role] ?? '不明'} size="small" variant="outlined" />
              </Box>
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                参画しているプロジェクト（{user.projects.length}）
              </Typography>
              {user.projects.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  参画しているプロジェクトはありません
                </Typography>
              ) : (
                <Paper variant="outlined">
                  <List disablePadding dense>
                    {user.projects.map((project, i) => {
                      const content = (
                        <>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <FolderOutlinedIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={project.name}
                            slotProps={{ primary: { sx: { wordBreak: 'break-word' } } }}
                          />
                        </>
                      )
                      const divider = i < user.projects.length - 1
                      return canOpenProjects ? (
                        <ListItemButton
                          key={project.id}
                          component={RouterLink}
                          to={`/projects/${project.id}/tasks`}
                          divider={divider}
                        >
                          {content}
                        </ListItemButton>
                      ) : (
                        <ListItem key={project.id} divider={divider}>
                          {content}
                        </ListItem>
                      )
                    })}
                  </List>
                </Paper>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          閉じる
        </Button>
        {user && canEdit && (
          <Button variant="contained" onClick={() => onEdit(user)}>
            編集
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default UserDetailDialog
