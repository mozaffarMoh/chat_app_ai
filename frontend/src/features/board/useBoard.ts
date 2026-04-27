import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocketInstances } from '../../shared/hooks/useSocket'
import { conversationsService } from '../conversations/conversations.service'
import type { Conversation } from '../../shared/types'

type BoardStatus = 'ACTIVE' | 'AWAITING_REPLY' | 'RESOLVED'

interface BoardColumns {
  ACTIVE: Conversation[]
  AWAITING_REPLY: Conversation[]
  RESOLVED: Conversation[]
}

interface UseBoardReturn {
  columns: BoardColumns
  moveCard: (id: string, newStatus: BoardStatus) => Promise<void>
  loading: boolean
}

export function useBoard(initialConversations: Conversation[]): UseBoardReturn {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [loading, setLoading] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    setConversations(initialConversations)
  }, [initialConversations])

  useEffect(() => {
    const { chatSocket } = getSocketInstances()
    if (!chatSocket) return

    const onBoardUpdated = (updated: Conversation) => {
      if (!mounted.current) return
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, boardStatus: updated.boardStatus } : c)),
      )
    }

    chatSocket.on('chat:board:updated', onBoardUpdated)
    return () => {
      chatSocket.off('chat:board:updated', onBoardUpdated)
    }
  }, [])

  const moveCard = useCallback(async (id: string, newStatus: BoardStatus) => {
    setLoading(true)
    try {
      const updated = await conversationsService.updateBoardStatus(id, newStatus)
      if (mounted.current) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, boardStatus: updated.boardStatus } : c)),
        )
      }
      const { chatSocket } = getSocketInstances()
      chatSocket?.emit('chat:board:move', { conversationId: id, boardStatus: newStatus })
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  const columns: BoardColumns = {
    ACTIVE: conversations.filter((c) => c.boardStatus === 'ACTIVE'),
    AWAITING_REPLY: conversations.filter((c) => c.boardStatus === 'AWAITING_REPLY'),
    RESOLVED: conversations.filter((c) => c.boardStatus === 'RESOLVED'),
  }

  return { columns, moveCard, loading }
}
