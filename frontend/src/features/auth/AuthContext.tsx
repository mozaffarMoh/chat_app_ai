import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import api from '../../shared/services/api'
import type { User } from '../../shared/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get<{ data: User }>('/users/me')
      setUser(res.data.data)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMe()
  }, [fetchMe])

  useEffect(() => {
    const handler = () => {
      void refreshToken()
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  })

  const login = async (email: string, password: string): Promise<void> => {
    await api.post('/auth/login', { email, password })
    await fetchMe()
  }

  const register = async (email: string, password: string, displayName: string): Promise<void> => {
    await api.post('/auth/register', { email, password, displayName })
    await fetchMe()
  }

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }

  const refreshToken = async (): Promise<void> => {
    try {
      await api.post('/auth/refresh')
      await fetchMe()
    } catch {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
