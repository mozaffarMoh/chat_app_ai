import api from '../../shared/services/api'
import type { Conversation } from '../../shared/types'

export const conversationsService = {
  getAll: async (): Promise<Conversation[]> => {
    const res = await api.get<{ data: Conversation[] }>('/conversations')
    return res.data.data
  },

  create: async (payload: {
    type: 'DIRECT' | 'GROUP'
    participantIds: string[]
    name?: string
  }): Promise<Conversation> => {
    const res = await api.post<{ data: Conversation }>('/conversations', payload)
    return res.data.data
  },

  getOne: async (id: string): Promise<Conversation> => {
    const res = await api.get<{ data: Conversation }>(`/conversations/${id}`)
    return res.data.data
  },

  updateBoardStatus: async (
    id: string,
    boardStatus: 'ACTIVE' | 'AWAITING_REPLY' | 'RESOLVED',
  ): Promise<Conversation> => {
    const res = await api.patch<{ data: Conversation }>(`/conversations/${id}/board-status`, {
      boardStatus,
    })
    return res.data.data
  },
}
