import { Form, Input, Button, Card, Typography, Alert } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './AuthContext'
import axios from 'axios'
import type { ApiError } from '../../shared/types'

interface LoginFormValues {
  email: string
  password: string
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: LoginFormValues) => {
    setError(null)
    setLoading(true)
    try {
      await login(values.email, values.password)
      navigate('/', { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { data?: ApiError } | undefined
        setError(data?.data?.message ?? 'Invalid email or password')
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>
          Sign In
        </Typography.Title>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={(v) => void onFinish(v as LoginFormValues)}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password placeholder="Your password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Sign In
            </Button>
          </Form.Item>
        </Form>
        <Typography.Text>
          Don't have an account? <Link to="/register">Register</Link>
        </Typography.Text>
      </Card>
    </div>
  )
}
