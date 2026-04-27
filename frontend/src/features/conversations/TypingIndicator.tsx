import { Typography } from 'antd'

const { Text } = Typography

interface TypingIndicatorProps {
  typingUsers: string[]
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing…`
      : `${typingUsers.join(', ')} are typing…`

  return (
    <div style={{ padding: '4px 16px' }} aria-live="polite" aria-atomic="true">
      <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
        {label}
      </Text>
    </div>
  )
}
