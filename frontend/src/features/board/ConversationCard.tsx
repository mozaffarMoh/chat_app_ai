import { Badge, Card, Spin, Typography } from 'antd'
import { useState } from 'react'
import type { Conversation, User } from '../../shared/types'

const { Text } = Typography

interface ConversationCardProps {
  conversation: Conversation & { unreadCount?: number; lastMessage?: { body: string } }
  currentUser: User
  onClick: (id: string) => void
  loading?: boolean
}

export function ConversationCard({
  conversation,
  currentUser,
  onClick,
  loading,
}: ConversationCardProps) {
  const [dragging, setDragging] = useState(false)

  const other = conversation.participants?.find((p) => p.userId !== currentUser.id)
  const title =
    conversation.type === 'DIRECT'
      ? (other?.user?.displayName ?? 'Unknown')
      : (conversation.name ?? 'Group')

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('conversationId', conversation.id)
    e.dataTransfer.setData('currentStatus', conversation.boardStatus ?? 'ACTIVE')
    setDragging(true)
  }

  const handleDragEnd = () => setDragging(false)

  return (
    <Card
      size="small"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick(conversation.id)}
      style={{
        marginBottom: 8,
        cursor: 'grab',
        opacity: dragging ? 0.5 : 1,
        borderRadius: 8,
      }}
      title={
        <Badge count={conversation.unreadCount ?? 0} offset={[8, 0]}>
          <Text strong style={{ fontSize: 13 }}>
            {title}
          </Text>
        </Badge>
      }
      extra={loading && <Spin size="small" />}
    >
      <Text type="secondary" ellipsis style={{ fontSize: 12, maxWidth: 180, display: 'block' }}>
        {conversation.lastMessage?.body ?? 'No messages yet'}
      </Text>
    </Card>
  )
}
