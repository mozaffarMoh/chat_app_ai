import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Empty, Space, Spin, Typography } from 'antd'
import { PhoneFilled, VideoCameraFilled } from '@ant-design/icons'
import { messagesService } from './messages.service'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { VoiceRecorder } from '../chat/VoiceRecorder'
import { getSocketInstances } from '../../shared/hooks/useSocket'
import type { Message, User } from '../../shared/types'

const { Title } = Typography

interface ChatViewProps {
  conversationId: string
  conversationTitle: string
  currentUser: User
  recipientId?: string
  onStartCall?: (type: 'AUDIO' | 'VIDEO') => void
}

interface TypingEvent {
  userId: string
  conversationId: string
  isTyping: boolean
  senderName?: string
}

export function ChatView({ conversationId, conversationTitle, currentUser, recipientId, onStartCall }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const { messages: msgs, hasMore: more } = await messagesService.getMessages(conversationId)
      setMessages(msgs)
      setHasMore(more)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  const loadMore = async () => {
    if (!messages.length) return
    const oldest = messages[0]?.sentAt
    const { messages: older, hasMore: more } = await messagesService.getMessages(
      conversationId,
      oldest,
    )
    setMessages((prev) => [...older, ...prev])
    setHasMore(more)
  }

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const { chatSocket } = getSocketInstances()
    if (!chatSocket) return

    chatSocket.emit('chat:join', { conversationId })

    const onNewMessage = (msg: Message) => {
      setMessages((prev) => {
        // Deduplicate: voice messages are also added via onRecorded REST response
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      // mark read
      chatSocket.emit('chat:message:read', { conversationId, upToMessageId: msg.id })
    }

    const onTypingUpdate = (data: TypingEvent) => {
      if (data.conversationId !== conversationId || data.userId === currentUser.id) return
      setTypingUsers((prev) => {
        const name = data.senderName ?? data.userId
        if (data.isTyping) {
          return prev.includes(name) ? prev : [...prev, name]
        } else {
          return prev.filter((u) => u !== name)
        }
      })
    }

    chatSocket.on('chat:message:new', onNewMessage)
    chatSocket.on('chat:typing:update', onTypingUpdate)

    return () => {
      chatSocket.off('chat:message:new', onNewMessage)
      chatSocket.off('chat:typing:update', onTypingUpdate)
      chatSocket.emit('chat:leave', { conversationId })
    }
  }, [conversationId, currentUser.id])

  const handleSend = (body: string) => {
    const { chatSocket } = getSocketInstances()
    chatSocket?.emit('chat:message:send', { conversationId, body })
  }

  const handleTypingStart = () => {
    const { chatSocket } = getSocketInstances()
    chatSocket?.emit('chat:typing:start', { conversationId })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      chatSocket?.emit('chat:typing:stop', { conversationId })
    }, 3000)
  }

  const handleTypingStop = () => {
    const { chatSocket } = getSocketInstances()
    chatSocket?.emit('chat:typing:stop', { conversationId })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
  }

  const handleDelete = async (messageId: string) => {
    await messagesService.deleteMessage(conversationId, messageId)
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m)),
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={5} style={{ margin: 0 }}>
          {conversationTitle}
        </Title>
        {recipientId && onStartCall && (
          <Space>
            <Button
              size="small"
              icon={<PhoneFilled />}
              onClick={() => onStartCall('AUDIO')}
              aria-label="Start audio call"
            />
            <Button
              size="small"
              icon={<VideoCameraFilled />}
              onClick={() => onStartCall('VIDEO')}
              aria-label="Start video call"
            />
          </Space>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {hasMore && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Button size="small" onClick={() => void loadMore()}>
              Load older
            </Button>
          </div>
        )}
        {messages.length === 0 && <Empty description="No messages yet. Say hello!" />}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            currentUser={currentUser}
            onDelete={(id) => void handleDelete(id)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingRight: 16 }}>
        <div style={{ flex: 1 }}>
          <MessageInput
            onSend={handleSend}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        </div>
        <div style={{ paddingBottom: 8 }}>
          <VoiceRecorder
            conversationId={conversationId}
            onRecorded={(msg) => setMessages((prev) => [...prev, msg])}
          />
        </div>
      </div>
    </div>
  )
}
