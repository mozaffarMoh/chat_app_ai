import { useState } from 'react'
import { Form, Input, Button, Card, Typography, App } from 'antd'
import { useAuth } from '../auth/AuthContext'
import api from '../../shared/services/api'
import type { User } from '../../shared/types'
import axios from 'axios'

interface ProfileFormValues {
  displayName: string
  avatarUrl?: string
}

export function ProfilePage() {
  const { user } = useAuth()
  const { notification } = App.useApp()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: ProfileFormValues) => {
    setLoading(true)
    try {
      await api.patch<{ data: User }>('/users/me', values)
      notification.success({ message: 'Profile updated successfully' })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { data?: { message?: string } })?.data?.message
        notification.error({ message: msg ?? 'Failed to update profile' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <Card style={{ width: 480 }}>
        <Typography.Title level={4}>Edit Profile</Typography.Title>
        <Form
          layout="vertical"
          initialValues={{ displayName: user?.displayName, avatarUrl: user?.avatarUrl }}
          onFinish={(v) => void onFinish(v as ProfileFormValues)}
        >
          <Form.Item
            label="Display Name"
            name="displayName"
            rules={[{ required: true, min: 1, max: 60, message: 'Display name is required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Avatar URL"
            name="avatarUrl"
            rules={[{ type: 'url', message: 'Must be a valid URL' }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
