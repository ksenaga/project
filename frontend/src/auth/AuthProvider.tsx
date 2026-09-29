import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import type { LoginUser } from '../pages/LoginPage'
import { AuthContext } from './AuthContext'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<LoginUser | null>(null)
  const [loading, setLoading] = useState(true)

  // 画面を再読み込みしても、Cookie の JWT が有効ならログイン状態を復元する
  useEffect(() => {
    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, setUser, logout }), [user, loading, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
