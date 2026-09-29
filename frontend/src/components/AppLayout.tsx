import { AppBar, Box, IconButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import { Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'

// ログイン後の画面共通のヘッダー
const AppLayout = () => {
  const { user, logout } = useAuth()

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexGrow: 1 }}>
            <TaskAltIcon color="primary" />
            <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 700 }}>
              Task Manager
            </Typography>
          </Stack>
          {user && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}
              >
                {user.name}
              </Typography>
            </Stack>
          )}
          <Tooltip title="ログアウト">
            <IconButton aria-label="ログアウト" onClick={logout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Outlet />
    </Box>
  )
}

export default AppLayout
