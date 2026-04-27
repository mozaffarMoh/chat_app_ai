import { Typography } from 'antd'
import type { Message, User } from '../../shared/types'
import { VoiceMessagePlayer } from '../chat/VoiceMessagePlayer'
const { Text } = Typography

interface MessageBubbleProps {
  message: Message
  currentUser: User
  onDelete?: (messageId: string) => void
}

export function MessageBubble({ message, currentUser, onDelete }: MessageBubbleProps) {
  const isMine = message.senderId === currentUser.id

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        marginBottom: 8,
        gap: 8,
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          background: isMine ? '#1677ff' : '#f0f0f0',
          color: isMine ? '#fff' : 'inherit',
          borderRadius: 12,
          padding: '8px 12px',
          position: 'relative',
        }}
      >
        {!isMine && (
          <Text strong style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#888' }}>
            {message.sender?.displayName}
          </Text>
        )}
        <Text style={{ color: 'inherit' }}>
          {message.deletedAt ? (
            <em>Message deleted</em>
          ) : message.type === 'VOICE' && message.voiceRecording ? (
            <VoiceMessagePlayer
              src={message.voiceRecording.filePath}
              durationSeconds={message.voiceRecording.durationSeconds}
            />
          ) : (
            message.body
          )}
        </Text>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, gap: 8 }}>
          <Text style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.7)' : '#aaa' }}>
            {new Date(message.sentAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isMine && !message.deletedAt && onDelete && (
            <Text
              style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
              onClick={() => onDelete(message.id)}
            >
              Delete
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}
