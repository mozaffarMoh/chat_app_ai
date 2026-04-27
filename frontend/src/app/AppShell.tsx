import { lazy, Suspense } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Layout, Spin, Avatar, Dropdown, Button } from 'antd'
import { UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { useAuth } from '../features/auth/AuthContext'
import { ErrorBoundary } from '../shared/components/ErrorBoundary'

const WorkspaceLayout = lazy(() =>
  import('../features/conversations/WorkspaceLayout').then((m) => ({ default: m.WorkspaceLayout })),
)
const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)

const { Header, Content } = Layout

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const menuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: () => void handleLogout(),
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">Profile</Link>,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <span style={{ color: 'white', fontWeight: 600, fontSize: 18 }}>ChatApp</span>
        <Dropdown menu={{ items: menuItems }} placement="bottomRight">
          <Button type="text" style={{ color: 'white' }}>
            <Avatar icon={<UserOutlined />} src={user?.avatarUrl} size="small" />
            <span style={{ marginLeft: 8 }}>{user?.displayName}</span>
          </Button>
        </Dropdown>
      </Header>
      <Content>
        <Suspense
          fallback={<Spin style={{ display: 'flex', justifyContent: 'center', padding: 48 }} />}
        >
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<WorkspaceLayout />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </ErrorBoundary>
        </Suspense>
      </Content>
    </Layout>
  )
}
