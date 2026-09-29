import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import { useAuth } from './auth/AuthContext'
import { AuthProvider } from './auth/AuthProvider'
import RequireAuth from './auth/RequireAuth'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import ProjectPage from './pages/ProjectPage'
import TaskBoardPage from './pages/TaskBoardPage'

const LoginRoute = () => {
  const { user, loading, setUser } = useAuth()
  const navigate = useNavigate()

  if (loading) return null
  // ログイン済みならプロジェクト一覧へ
  if (user) return <Navigate to="/projects" replace />
  return (
    <LoginPage
      onLoginSuccess={(loginUser) => {
        setUser(loginUser)
        navigate('/projects', { replace: true })
      }}
    />
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/projects" element={<ProjectPage />} />
              <Route path="/projects/:projectId/tasks" element={<TaskBoardPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
