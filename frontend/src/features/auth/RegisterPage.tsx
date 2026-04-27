import { Form, Input, Button, Card, Typography, Alert } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './AuthContext'
import type { ApiError } from '../../shared/types'
import axios from 'axios'

interface RegisterFormValues {
  displayName: string
  email: string
  password: string
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: RegisterFormValues) => {
    setError(null)
    setFieldErrors({})
    setLoading(true)
    try {
      await register(values.email, values.password, values.displayName)
      navigate('/', { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { data?: ApiError } | undefined
        const apiErr = data?.data
        if (apiErr?.fields) {
          const fe: Record<string, string> = {}
          for (const f of apiErr.fields) fe[f.field] = f.message
          setFieldErrors(fe)
        } else {
          setError(apiErr?.message ?? 'Registration failed')
        }
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
          Create Account
        </Typography.Title>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={(v) => void onFinish(v as RegisterFormValues)}>
          <Form.Item
            label="Display Name"
            name="displayName"
            validateStatus={fieldErrors['displayName'] ? 'error' : undefined}
            help={fieldErrors['displayName']}
            rules={[{ required: true, message: 'Display name is required' }]}
          >
            <Input placeholder="Your name" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            validateStatus={fieldErrors['email'] ? 'error' : undefined}
            help={fieldErrors['email']}
            rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            validateStatus={fieldErrors['password'] ? 'error' : undefined}
            help={fieldErrors['password']}
            rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters' }]}
          >
            <Input.Password placeholder="At least 8 characters" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Register
            </Button>
          </Form.Item>
        </Form>
        <Typography.Text>
          Already have an account? <Link to="/login">Sign in</Link>
        </Typography.Text>
      </Card>
    </div>
  )
}
