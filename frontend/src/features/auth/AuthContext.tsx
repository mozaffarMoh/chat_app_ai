import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import axios from 'axios'
import api, { updateAuthState } from '../../shared/services/api'
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
  const isRefreshingRef = useRef(false)

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get<{ data: User }>('/users/me')
      setUser(res.data.data)
      updateAuthState(true)
    } catch {
      setUser(null)
      updateAuthState(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMe()
  }, [fetchMe])

  useEffect(() => {
    const handler = () => {
      if (isRefreshingRef.current) return
      isRefreshingRef.current = true
      void refreshToken().finally(() => {
        isRefreshingRef.current = false
      })
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    await api.post('/auth/login', { email, password })
    await fetchMe()
  }

  const register = async (email: string, password: string, displayName: string): Promise<void> => {
    await api.post('/auth/register', { email, password, displayName })
    await fetchMe()
  }

  const logout = async (): Promise<void> => {
    updateAuthState(false)
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
    } catch (err) {
      // Only log out on 401 (token invalid/expired). Ignore 500 / network errors
      // to avoid kicking the user out due to a transient server issue.
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setUser(null)
        updateAuthState(false)
      }
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
