import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import type { ReactNode } from 'react'
import { AuthProvider } from '../features/auth/AuthContext'

interface ProvidersProps {
  children: ReactNode
}

function getDirection(): 'ltr' | 'rtl' {
  const stored = localStorage.getItem('ui:direction')
  if (stored === 'rtl' || stored === 'ltr') return stored
  return (document.documentElement.dir as 'ltr' | 'rtl') || 'ltr'
}

export function Providers({ children }: ProvidersProps) {
  const direction = getDirection()

  return (
    <BrowserRouter>
      <ConfigProvider
        direction={direction}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1d58aa',
            borderRadius: 8,
          },
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  )
}
