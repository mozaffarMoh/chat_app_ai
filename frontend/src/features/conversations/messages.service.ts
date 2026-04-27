import api from '../../shared/services/api'
import type { Message } from '../../shared/types'

interface PaginatedMessages {
  messages: Message[]
  hasMore: boolean
}

export const messagesService = {
  getMessages: async (
    conversationId: string,
    before?: string,
    limit = 50,
  ): Promise<PaginatedMessages> => {
    const params: Record<string, string> = { limit: String(limit) }
    if (before) params['before'] = before
    const res = await api.get<{ data: PaginatedMessages }>(
      `/conversations/${conversationId}/messages`,
      { params },
    )
    return res.data.data
  },

  deleteMessage: async (conversationId: string, messageId: string): Promise<Message> => {
    const res = await api.delete<{ data: Message }>(
      `/conversations/${conversationId}/messages/${messageId}`,
    )
    return res.data.data
  },
}
