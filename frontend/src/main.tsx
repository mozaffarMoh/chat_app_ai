import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from 'antd'
import './index.css'
import { Providers } from './app/providers'
import { AppRouter } from './app/router'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')

createRoot(rootEl).render(
  <StrictMode>
    <Providers>
      <App>
        <AppRouter />
      </App>
    </Providers>
  </StrictMode>,
)
