import { Button, Input } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { useState, type KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (body: string) => void
  onTypingStart?: () => void
  onTypingStop?: () => void
  disabled?: boolean
}

export function MessageInput({ onSend, onTypingStart, onTypingStop, disabled }: MessageInputProps) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    onTypingStop?.()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (val: string) => {
    setValue(val)
    if (val.length > 0) {
      onTypingStart?.()
    } else {
      onTypingStop?.()
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderTop: '1px solid #f0f0f0' }}>
      <Input.TextArea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
        autoSize={{ minRows: 1, maxRows: 5 }}
        disabled={disabled}
        style={{ flex: 1 }}
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      />
    </div>
  )
}
