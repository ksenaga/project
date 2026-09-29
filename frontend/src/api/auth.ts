import type { LoginUser } from '../pages/LoginPage'
import { request } from './client'

export const fetchMe = () => request<LoginUser>('/me')

export const logout = () => request<void>('/logout', { method: 'POST' })
