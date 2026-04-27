import api from '../../shared/services/api'
import type { Message } from '../../shared/types'

export const voiceService = {
  uploadVoiceMessage: async (
    conversationId: string,
    blob: Blob,
    durationSeconds: number,
  ): Promise<Message> => {
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')
    formData.append('durationSeconds', String(durationSeconds))
    const res = await api.post<{ data: Message }>(
      `/conversations/${conversationId}/messages/voice`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data.data
  },
}
