import { AppBar, Box, Button, IconButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import NotificationBell from './NotificationBell'
import UserAvatar from './UserAvatar'

const NAV_ITEMS = [
  { to: '/projects', label: 'プロジェクト' },
  { to: '/users', label: 'ユーザー' },
]

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
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TaskAltIcon color="primary" />
            <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 700 }}>
              Task Manager
            </Typography>
          </Stack>
          <Stack component="nav" direction="row" spacing={0.5} sx={{ flexGrow: 1, ml: 2 }}>
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                color="inherit"
                sx={{
                  color: 'text.secondary',
                  '&.active': { color: 'primary.main', bgcolor: 'rgba(79, 70, 229, 0.08)' },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
          {user && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <UserAvatar user={user} size={30} />
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}
              >
                {user.name}
              </Typography>
            </Stack>
          )}
          <NotificationBell />
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
