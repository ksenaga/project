import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router'
import { useAuth } from './AuthContext'

// ログインしていなければログイン画面へ
const RequireAuth = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export default RequireAuth
