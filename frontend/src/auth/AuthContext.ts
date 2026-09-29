import { createContext, useContext } from 'react'
import type { LoginUser } from '../pages/LoginPage'

export type AuthContextValue = {
  user: LoginUser | null
  // 起動時のログイン確認(/api/me)が終わるまで true
  loading: boolean
  setUser: (user: LoginUser | null) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = () => {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth は AuthProvider の中で使ってください')
  return value
}
