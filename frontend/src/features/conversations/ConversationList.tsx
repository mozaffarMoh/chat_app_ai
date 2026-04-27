import { Avatar, Badge, Button, Empty, List, Skeleton, Typography } from 'antd'
import type { Conversation, User } from '../../shared/types'

const { Text } = Typography

interface ConversationListProps {
  conversations: (Conversation & { unreadCount?: number; lastMessage?: { body: string } })[]
  activeId?: string
  currentUser: User
  loading?: boolean
  onSelect: (id: string) => void
  onNewConversation?: () => void
}

export function ConversationList({
  conversations,
  activeId,
  currentUser,
  loading,
  onSelect,
  onNewConversation,
}: ConversationListProps) {
  if (loading) {
    return (
      <div style={{ padding: '8px 16px' }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} active avatar paragraph={{ rows: 1 }} style={{ marginBottom: 12 }} />
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty description="No conversations yet">
          {onNewConversation && (
            <Button type="primary" onClick={onNewConversation}>
              Start your first conversation
            </Button>
          )}
        </Empty>
      </div>
    )
  }

  return (
    <List
      className="conversation-list"
      dataSource={conversations}
      renderItem={(conv) => {
        const isActive = conv.id === activeId
        const other = conv.participants?.find((p) => p.userId !== currentUser.id)
        const title =
          conv.type === 'DIRECT' ? (other?.user?.displayName ?? 'Unknown') : (conv.name ?? 'Group')
        return (
          <List.Item
            style={{
              cursor: 'pointer',
              padding: '8px 16px',
              background: isActive ? '#e6f4ff' : undefined,
            }}
            onClick={() => onSelect(conv.id)}
          >
            <List.Item.Meta
              avatar={<Avatar>{title[0]?.toUpperCase()}</Avatar>}
              title={
                <Badge count={conv.unreadCount ?? 0} offset={[8, 0]}>
                  <Text strong={isActive}>{title}</Text>
                </Badge>
              }
              description={
                <Text type="secondary" ellipsis style={{ maxWidth: 160 }}>
                  {conv.lastMessage?.body ?? 'No messages yet'}
                </Text>
              }
            />
          </List.Item>
        )
      }}
    />
  )
}
