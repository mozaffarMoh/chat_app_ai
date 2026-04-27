import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { ProtectedRoute } from './ProtectedRoute'

const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('../features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const AppShell = lazy(() => import('./AppShell').then((m) => ({ default: m.AppShell })))

const Loading = () => (
  <div
    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
  >
    <Spin size="large" />
  </div>
)

export function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<AppShell />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
