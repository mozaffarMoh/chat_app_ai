import { Typography } from 'antd'
import { useState } from 'react'
import { ConversationCard } from './ConversationCard'
import type { Conversation, User } from '../../shared/types'
import { useBoard } from './useBoard'

const { Title } = Typography

type BoardStatus = 'ACTIVE' | 'AWAITING_REPLY' | 'RESOLVED'

const COLUMNS: { key: BoardStatus; label: string; color: string }[] = [
  { key: 'ACTIVE', label: 'Active', color: '#f0f7ff' },
  { key: 'AWAITING_REPLY', label: 'Awaiting Reply', color: '#fff7e6' },
  { key: 'RESOLVED', label: 'Resolved', color: '#f6ffed' },
]

interface BoardViewProps {
  conversations: Conversation[]
  currentUser: User
  onSelectConversation: (id: string) => void
}

export function BoardView({ conversations, currentUser, onSelectConversation }: BoardViewProps) {
  const { columns, moveCard, loading } = useBoard(conversations)
  const [over, setOver] = useState<BoardStatus | null>(null)

  const handleDragOver = (e: React.DragEvent, status: BoardStatus) => {
    e.preventDefault()
    setOver(status)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: BoardStatus) => {
    e.preventDefault()
    setOver(null)
    const conversationId = e.dataTransfer.getData('conversationId')
    const currentStatus = e.dataTransfer.getData('currentStatus') as BoardStatus
    if (conversationId && currentStatus !== newStatus) {
      await moveCard(conversationId, newStatus)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, height: '100%', overflow: 'auto' }}>
      {COLUMNS.map(({ key, label, color }) => (
        <div
          key={key}
          onDragOver={(e) => handleDragOver(e, key)}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => void handleDrop(e, key)}
          style={{
            flex: 1,
            minWidth: 240,
            background: over === key ? '#e6f4ff' : color,
            borderRadius: 8,
            padding: 12,
            transition: 'background 0.2s',
            border: over === key ? '2px dashed #1677ff' : '2px solid transparent',
          }}
        >
          <Title level={5} style={{ margin: '0 0 12px', textAlign: 'center' }}>
            {label} ({columns[key].length})
          </Title>
          {columns[key].map((conv) => (
            <ConversationCard
              key={conv.id}
              conversation={
                conv as Conversation & { unreadCount?: number; lastMessage?: { body: string } }
              }
              currentUser={currentUser}
              onClick={onSelectConversation}
              loading={loading}
            />
          ))}
          {columns[key].length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: '#bbb',
                fontSize: 12,
                marginTop: 24,
                fontStyle: 'italic',
              }}
            >
              Drop here
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
