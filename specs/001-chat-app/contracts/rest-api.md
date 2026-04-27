# REST API Contract

**Feature**: 001-chat-app | **Phase**: 1 | **Date**: 2026-04-26  
**Base URL**: `/api/v1`  
**Auth**: httpOnly cookie (`accessToken`) set by login/register endpoints.  
All endpoints marked 🔒 require a valid access token; unauthenticated requests receive `401`.

---

## Auth

### POST /auth/register

Register a new user account.

**Request body**

```json
{
  "email": "user@example.com",
  "password": "Min8Chars!",
  "displayName": "Alice"
}
```

**Responses**
| Status | Body | Notes |
|--------|------|-------|
| 201 | `{ "id": "...", "email": "...", "displayName": "..." }` | Sets `accessToken` + `refreshToken` cookies |
| 400 | `{ "error": "VALIDATION_ERROR", "fields": [...] }` | Invalid input |
| 409 | `{ "error": "EMAIL_TAKEN" }` | Duplicate email |

---

### POST /auth/login

Authenticate and receive session cookies.

**Request body**

```json
{ "email": "user@example.com", "password": "Min8Chars!" }
```

**Responses**
| Status | Body | Notes |
|--------|------|-------|
| 200 | `{ "id": "...", "email": "...", "displayName": "...", "avatarUrl": null }` | Sets cookies |
| 401 | `{ "error": "INVALID_CREDENTIALS" }` | |

---

### POST /auth/logout 🔒

Invalidate current session.

**Responses**
| Status | Body |
|--------|------|
| 204 | _(empty)_ — clears cookies |

---

### POST /auth/refresh

Exchange a valid refresh token cookie for new tokens.

**Responses**
| Status | Body | Notes |
|--------|------|-------|
| 200 | `{ "ok": true }` | Rotates both cookies |
| 401 | `{ "error": "REFRESH_TOKEN_INVALID" }` | |

---

## Users

### GET /users/me 🔒

Get the authenticated user's profile.

**Response 200**

```json
{
  "id": "...",
  "email": "...",
  "displayName": "...",
  "avatarUrl": "...",
  "presenceStatus": "ONLINE"
}
```

---

### PATCH /users/me 🔒

Update display name or avatar URL.

**Request body** (all fields optional)

```json
{ "displayName": "Alice B.", "avatarUrl": "https://..." }
```

**Responses**
| Status | Body |
|--------|------|
| 200 | Updated user object |
| 400 | Validation error |

---

### GET /users/search 🔒

Search registered users by display name or email (for starting conversations).

**Query params**: `q` (string, min 2 chars), `limit` (default 20, max 50)

**Response 200**

```json
[{ "id": "...", "displayName": "...", "avatarUrl": "...", "presenceStatus": "OFFLINE" }]
```

---

## Conversations

### GET /conversations 🔒

List all conversations for the authenticated user, sorted by `lastActivityAt` descending.

**Response 200**

```json
[
  {
    "id": "...",
    "type": "DIRECT",
    "name": null,
    "boardStatus": "ACTIVE",
    "lastActivityAt": "2026-04-26T10:00:00Z",
    "unreadCount": 3,
    "participants": [{ "id": "...", "displayName": "...", "avatarUrl": "...", "presenceStatus": "ONLINE" }],
    "lastMessage": {
      "type": "TEXT",
      "body": "Hey!",
      "sentAt": "2026-04-26T10:00:00Z",
      "senderDisplayName": "Bob"
    }
  }
]
```

---

### POST /conversations 🔒

Create a new direct or group conversation.

**Request body**

```json
{
  "type": "DIRECT",
  "participantIds": ["userId2"]
}
```

```json
{
  "type": "GROUP",
  "name": "Team Chat",
  "participantIds": ["userId2", "userId3"]
}
```

**Responses**
| Status | Body | Notes |
|--------|------|-------|
| 201 | Conversation object | |
| 400 | Validation error | |
| 409 | `{ "error": "CONVERSATION_EXISTS" }` | For DIRECT duplicates |

---

### GET /conversations/:id 🔒

Get a single conversation (must be a participant).

**Responses**
| Status | Body |
|--------|------|
| 200 | Conversation object (same shape as list item) |
| 403 | Not a participant |
| 404 | Not found |

---

### PATCH /conversations/:id/board-status 🔒

Move a conversation to a different Kanban column.

**Request body**

```json
{ "boardStatus": "AWAITING_REPLY" }
```

**Responses**
| Status | Body |
|--------|------|
| 200 | `{ "id": "...", "boardStatus": "AWAITING_REPLY" }` |
| 400 | Invalid status value |
| 403 | Not a participant |

---

## Messages

### GET /conversations/:id/messages 🔒

Fetch message history (paginated, newest first).

**Query params**: `before` (ISO timestamp cursor), `limit` (default 50, max 100)

**Response 200**

```json
{
  "messages": [
    {
      "id": "...",
      "type": "TEXT",
      "body": "Hello",
      "sentAt": "2026-04-26T10:00:00Z",
      "deletedAt": null,
      "sender": { "id": "...", "displayName": "...", "avatarUrl": "..." },
      "readStatuses": [{ "userId": "...", "status": "READ", "readAt": "2026-04-26T10:01:00Z" }]
    }
  ],
  "nextCursor": "2026-04-26T09:50:00Z"
}
```

---

### DELETE /conversations/:id/messages/:messageId 🔒

Soft-delete a message (sender only).

**Responses**
| Status | Body |
|--------|------|
| 200 | `{ "id": "...", "deletedAt": "..." }` |
| 403 | Not the sender |
| 404 | Not found |

---

### POST /conversations/:id/messages/voice 🔒

Upload a voice message (multipart/form-data).

**Request**: `Content-Type: multipart/form-data`  
Field `audio`: binary; max 4 MB; accepted MIME: `audio/webm`, `audio/ogg`, `audio/mp4`

**Responses**
| Status | Body | Notes |
|--------|------|-------|
| 201 | Message object (type: VOICE, voiceRecording: { durationSeconds, … }) | Triggers `newMessage` socket event |
| 400 | `{ "error": "INVALID_AUDIO" }` | Wrong MIME or exceeds size/duration |
| 403 | Not a participant |

---

## Call Sessions

### GET /conversations/:id/calls 🔒

List call history for a conversation.

**Response 200**

```json
[
  {
    "id": "...",
    "type": "VIDEO",
    "status": "ENDED",
    "initiator": { "id": "...", "displayName": "..." },
    "recipient": { "id": "...", "displayName": "..." },
    "startedAt": "...",
    "endedAt": "...",
    "durationSeconds": 142
  }
]
```

---

### POST /conversations/:id/calls 🔒

Create a call session record (REST). Actual signalling is over WebSocket.

**Request body**

```json
{ "type": "AUDIO", "recipientId": "userId2" }
```

**Responses**
| Status | Body | Notes |
|--------|------|-------|
| 201 | `{ "callSessionId": "..." }` | Use ID in `call:initiate` socket event |
| 409 | `{ "error": "RECIPIENT_BUSY" }` | Recipient has active call |

---

### PATCH /conversations/:id/calls/:callId 🔒

Update call status (accept, decline, end).

**Request body**

```json
{ "status": "ENDED" }
```

**Responses**
| Status | Body |
|--------|------|
| 200 | Updated CallSession object |
| 400 | Invalid status transition |

---

## Error Response Shape

All error responses follow:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "fields": [{ "field": "email", "message": "Invalid format" }]
}
```

`fields` is only present on `VALIDATION_ERROR`.
