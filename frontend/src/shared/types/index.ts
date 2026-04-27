export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  presenceStatus: 'ONLINE' | 'OFFLINE'
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  type: 'DIRECT' | 'GROUP'
  name?: string
  boardStatus: 'ACTIVE' | 'AWAITING_REPLY' | 'RESOLVED'
  lastActivityAt: string
  createdAt: string
  updatedAt: string
  participants: ConversationParticipant[]
  lastMessage?: Message
  unreadCount?: number
}

export interface ConversationParticipant {
  id: string
  userId: string
  conversationId: string
  joinedAt: string
  user: User
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  type: 'TEXT' | 'VOICE'
  body?: string
  voiceRecordingId?: string
  voiceRecording?: VoiceRecording
  sentAt: string
  deletedAt?: string
  sender: User
  readStatuses: MessageReadStatus[]
}

export interface VoiceRecording {
  id: string
  filePath: string
  mimeType: string
  durationSeconds: number
  sizeBytes: number
  createdAt: string
}

export interface MessageReadStatus {
  id: string
  messageId: string
  userId: string
  status: 'DELIVERED' | 'READ'
  readAt?: string
}

export interface CallSession {
  id: string
  conversationId: string
  initiatorId: string
  recipientId: string
  type: 'AUDIO' | 'VIDEO'
  status: 'RINGING' | 'ACTIVE' | 'ENDED' | 'DECLINED' | 'MISSED' | 'FAILED'
  startedAt?: string
  endedAt?: string
  durationSeconds?: number
  createdAt: string
  initiator: User
  recipient: User
}

export interface ApiError {
  error: string
  message: string
  fields?: { field: string; message: string }[]
  path: string
  timestamp: string
}

export interface ApiResponse<T> {
  data: T
}

export type BoardStatus = 'ACTIVE' | 'AWAITING_REPLY' | 'RESOLVED'
export type CallType = 'AUDIO' | 'VIDEO'
export type MessageType = 'TEXT' | 'VOICE'
