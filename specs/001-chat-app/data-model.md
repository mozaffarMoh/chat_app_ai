# Data Model: Real-Time Chat Application

**Feature**: 001-chat-app | **Phase**: 1 | **Date**: 2026-04-26  
**Source**: spec.md (Key Entities) + research.md decisions R1, R3, R4, R5

---

## Entity Relationship Overview

```
User ──< RefreshTokenSession
User >──< Conversation (via ConversationParticipant)
Conversation ──< Message
Message ──? VoiceRecording          (nullable; only for voice messages)
Message ──< MessageReadStatus
User ──< CallSession (as initiator)
User ──< CallSession (as recipient)
```

---

## Entities

### User

Represents a registered account holder.

| Field          | Type                   | Constraints      | Notes                                |
| -------------- | ---------------------- | ---------------- | ------------------------------------ |
| id             | String (cuid)          | PK               |                                      |
| email          | String                 | unique, not null | Lowercase-normalised on write        |
| passwordHash   | String                 | not null         | Argon2id hash                        |
| displayName    | String                 | not null, max 60 |                                      |
| avatarUrl      | String?                | nullable         | Path or URL                          |
| presenceStatus | Enum (ONLINE, OFFLINE) | default OFFLINE  | Updated on socket connect/disconnect |
| createdAt      | DateTime               | default now()    |                                      |
| updatedAt      | DateTime               | auto-update      |                                      |

**Relations**: `RefreshTokenSession[]`, `ConversationParticipant[]`, `Message[]` (sent), `MessageReadStatus[]`, `CallSession[]` (initiated + received)

**Validation rules**:

- `email`: valid RFC 5322 format; max 254 chars
- `passwordHash`: never returned in API responses
- `displayName`: trimmed, 1–60 characters

---

### RefreshTokenSession

Stores a hashed refresh token for rotation and revocation.

| Field     | Type          | Constraints       | Notes                         |
| --------- | ------------- | ----------------- | ----------------------------- |
| id        | String (cuid) | PK                |                               |
| userId    | String        | FK → User         | Cascade delete                |
| tokenHash | String        | unique            | SHA-256 hash of refresh token |
| expiresAt | DateTime      | not null, indexed | Used for cleanup queries      |
| createdAt | DateTime      | default now()     |                               |
| isValid   | Boolean       | default true      | Set false on logout/rotation  |

**Validation rules**:

- Expired sessions (`expiresAt < now()`) are treated as invalid; a scheduled job or query
  filter cleans them up.

---

### Conversation

A communication thread between two or more participants.

| Field          | Type                                    | Constraints            | Notes                           |
| -------------- | --------------------------------------- | ---------------------- | ------------------------------- |
| id             | String (cuid)                           | PK                     |                                 |
| type           | Enum (DIRECT, GROUP)                    | not null               |                                 |
| name           | String?                                 | nullable               | Only for GROUP; null for DIRECT |
| boardStatus    | Enum (ACTIVE, AWAITING_REPLY, RESOLVED) | default ACTIVE         | Kanban column                   |
| lastActivityAt | DateTime                                | default now(), indexed | Used for list sort order        |
| createdAt      | DateTime                                | default now()          |                                 |
| updatedAt      | DateTime                                | auto-update            |                                 |

**Relations**: `ConversationParticipant[]`, `Message[]`

**Validation rules**:

- DIRECT conversations: exactly 2 participants; `name` is null.
- GROUP conversations: 2–50 participants; `name` required, 1–80 chars.
- Uniqueness constraint on DIRECT: no two users may have more than one DIRECT conversation
  together (enforced at service layer with a query before creation).

---

### ConversationParticipant

Join table between User and Conversation.

| Field          | Type          | Constraints       | Notes |
| -------------- | ------------- | ----------------- | ----- |
| id             | String (cuid) | PK                |       |
| userId         | String        | FK → User         |       |
| conversationId | String        | FK → Conversation |       |
| joinedAt       | DateTime      | default now()     |       |

**Constraints**: Composite unique on `(userId, conversationId)`.

---

### Message

A single communication unit within a conversation.

| Field            | Type               | Constraints                          | Notes                        |
| ---------------- | ------------------ | ------------------------------------ | ---------------------------- |
| id               | String (cuid)      | PK                                   |                              |
| conversationId   | String             | FK → Conversation, indexed           |                              |
| senderId         | String             | FK → User                            |                              |
| type             | Enum (TEXT, VOICE) | not null                             |                              |
| body             | String?            | nullable                             | Text content; null for VOICE |
| voiceRecordingId | String?            | nullable, unique FK → VoiceRecording | Only for VOICE               |
| sentAt           | DateTime           | default now(), indexed               |                              |
| deletedAt        | DateTime?          | nullable                             | Soft-delete; null = active   |

**Relations**: `MessageReadStatus[]`, `VoiceRecording?`

**Validation rules**:

- TEXT: `body` required (1–4000 chars); `voiceRecordingId` must be null.
- VOICE: `voiceRecordingId` required; `body` must be null.
- `deletedAt` set instead of hard delete; clients render "Message deleted" when non-null.

---

### MessageReadStatus

Per-recipient read tracking for a message.

| Field     | Type                   | Constraints       | Notes                  |
| --------- | ---------------------- | ----------------- | ---------------------- |
| id        | String (cuid)          | PK                |                        |
| messageId | String                 | FK → Message      |                        |
| userId    | String                 | FK → User         | Recipient              |
| status    | Enum (DELIVERED, READ) | default DELIVERED |                        |
| readAt    | DateTime?              | nullable          | Set when status = READ |

**Constraints**: Composite unique on `(messageId, userId)`.

---

### VoiceRecording

Stores metadata for an uploaded audio clip.

| Field           | Type          | Constraints       | Notes                          |
| --------------- | ------------- | ----------------- | ------------------------------ |
| id              | String (cuid) | PK                |                                |
| filePath        | String        | not null          | Server filesystem path or URL  |
| mimeType        | String        | not null          | e.g., `audio/webm;codecs=opus` |
| durationSeconds | Int           | not null, max 120 | Validated on upload            |
| sizeBytes       | Int           | not null          |                                |
| createdAt       | DateTime      | default now()     |                                |

**Validation rules**:

- `durationSeconds` max 120 (2 minutes); enforced by upload endpoint.
- `sizeBytes` max 4 MB (conservative ceiling for 2 min Opus at 128 kbps).

---

### CallSession

Records the lifecycle of a 1-on-1 audio or video call.

| Field           | Type                                                    | Constraints                | Notes                             |
| --------------- | ------------------------------------------------------- | -------------------------- | --------------------------------- |
| id              | String (cuid)                                           | PK                         |                                   |
| conversationId  | String                                                  | FK → Conversation, indexed |                                   |
| initiatorId     | String                                                  | FK → User                  |                                   |
| recipientId     | String                                                  | FK → User                  |                                   |
| type            | Enum (AUDIO, VIDEO)                                     | not null                   |                                   |
| status          | Enum (RINGING, ACTIVE, ENDED, DECLINED, MISSED, FAILED) | not null                   |                                   |
| startedAt       | DateTime?                                               | nullable                   | Set when ACTIVE                   |
| endedAt         | DateTime?                                               | nullable                   | Set when ENDED/DECLINED/FAILED    |
| durationSeconds | Int?                                                    | nullable                   | Computed from startedAt → endedAt |
| createdAt       | DateTime                                                | default now()              |                                   |

**Validation rules**:

- `initiatorId ≠ recipientId` (cannot call yourself).
- Only one RINGING or ACTIVE `CallSession` per user pair at a time (enforced at service layer).

---

## State Transitions

### Conversation.boardStatus

```
ACTIVE ──────────────────► AWAITING_REPLY
   ▲                               │
   └─────────── RESOLVED ◄─────────┘
   (any column can move to any other)
```

All transitions are user-initiated (drag on Kanban board); no automatic state changes.

### CallSession.status

```
RINGING ──► ACTIVE ──► ENDED
   │
   ├──► DECLINED  (recipient declines)
   ├──► MISSED    (timeout, no answer)
   └──► FAILED    (ICE connection failure)
```

---

## Prisma Schema (Reference)

```prisma
// This is the authoritative schema — generated during T001 (setup)
// Shown here for planning reference only.

enum PresenceStatus  { ONLINE OFFLINE }
enum ConversationType { DIRECT GROUP }
enum BoardStatus     { ACTIVE AWAITING_REPLY RESOLVED }
enum MessageType     { TEXT VOICE }
enum ReadStatus      { DELIVERED READ }
enum CallType        { AUDIO VIDEO }
enum CallStatus      { RINGING ACTIVE ENDED DECLINED MISSED FAILED }

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  displayName   String
  avatarUrl     String?
  presenceStatus PresenceStatus @default(OFFLINE)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      RefreshTokenSession[]
  participations ConversationParticipant[]
  sentMessages  Message[]
  readStatuses  MessageReadStatus[]
  initiatedCalls CallSession[] @relation("CallInitiator")
  receivedCalls  CallSession[] @relation("CallRecipient")
}

model RefreshTokenSession {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  isValid   Boolean  @default(true)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model Conversation {
  id             String           @id @default(cuid())
  type           ConversationType
  name           String?
  boardStatus    BoardStatus      @default(ACTIVE)
  lastActivityAt DateTime         @default(now())
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  participants   ConversationParticipant[]
  messages       Message[]
  calls          CallSession[]

  @@index([lastActivityAt])
}

model ConversationParticipant {
  id             String   @id @default(cuid())
  userId         String
  conversationId String
  joinedAt       DateTime @default(now())

  user         User         @relation(fields: [userId], references: [id])
  conversation Conversation @relation(fields: [conversationId], references: [id])

  @@unique([userId, conversationId])
}

model Message {
  id               String      @id @default(cuid())
  conversationId   String
  senderId         String
  type             MessageType
  body             String?
  voiceRecordingId String?     @unique
  sentAt           DateTime    @default(now())
  deletedAt        DateTime?

  conversation   Conversation   @relation(fields: [conversationId], references: [id])
  sender         User           @relation(fields: [senderId], references: [id])
  voiceRecording VoiceRecording? @relation(fields: [voiceRecordingId], references: [id])
  readStatuses   MessageReadStatus[]

  @@index([conversationId, sentAt])
}

model MessageReadStatus {
  id        String     @id @default(cuid())
  messageId String
  userId    String
  status    ReadStatus @default(DELIVERED)
  readAt    DateTime?

  message Message @relation(fields: [messageId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([messageId, userId])
}

model VoiceRecording {
  id              String   @id @default(cuid())
  filePath        String
  mimeType        String
  durationSeconds Int
  sizeBytes       Int
  createdAt       DateTime @default(now())

  message Message?
}

model CallSession {
  id             String     @id @default(cuid())
  conversationId String
  initiatorId    String
  recipientId    String
  type           CallType
  status         CallStatus
  startedAt      DateTime?
  endedAt        DateTime?
  durationSeconds Int?
  createdAt      DateTime   @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id])
  initiator    User         @relation("CallInitiator", fields: [initiatorId], references: [id])
  recipient    User         @relation("CallRecipient", fields: [recipientId], references: [id])

  @@index([conversationId])
}
```
