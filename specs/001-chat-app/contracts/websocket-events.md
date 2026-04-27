# WebSocket Events Contract

**Feature**: 001-chat-app | **Phase**: 1 | **Date**: 2026-04-26  
**Transport**: socket.io over WSS  
**Auth**: JWT passed in `socket.handshake.auth.token` at connection time; userId stored in `socket.data.userId`

---

## Namespaces

| Namespace | Purpose                                               |
| --------- | ----------------------------------------------------- |
| `/chat`   | Messages, typing indicators, presence, board updates  |
| `/calls`  | Call signalling (initiate, accept, decline, ICE, end) |

---

## Namespace: `/chat`

### Client → Server events

#### `chat:join`

Join a conversation room to receive real-time events for that conversation.  
Must be called after connecting and for each conversation the user opens.

**Payload**

```json
{ "conversationId": "conv_abc123" }
```

**Emits back**: `chat:joined` confirmation.

---

#### `chat:leave`

Leave a conversation room.

**Payload**

```json
{ "conversationId": "conv_abc123" }
```

---

#### `chat:message:send`

Send a text message. Server persists and broadcasts to room.

**Payload**

```json
{
  "conversationId": "conv_abc123",
  "body": "Hello!"
}
```

**Server emits** `chat:message:new` to all room members (including sender).

---

#### `chat:message:read`

Mark all messages in a conversation as read up to a given message ID.

**Payload**

```json
{
  "conversationId": "conv_abc123",
  "upToMessageId": "msg_xyz"
}
```

**Server emits** `chat:message:status` to room with updated statuses.

---

#### `chat:typing:start`

Notify participants that the user has started typing.

**Payload**

```json
{ "conversationId": "conv_abc123" }
```

**Server emits** `chat:typing:update` to room (excluding sender).  
Client must emit `chat:typing:stop` or server infers stop after 5 s of silence.

---

#### `chat:typing:stop`

Notify participants that the user stopped typing.

**Payload**

```json
{ "conversationId": "conv_abc123" }
```

---

#### `chat:board:move`

Move a conversation to a different Kanban column.  
Equivalent to `PATCH /conversations/:id/board-status` but over socket for instant board sync.

**Payload**

```json
{
  "conversationId": "conv_abc123",
  "boardStatus": "AWAITING_REPLY"
}
```

**Server emits** `chat:board:updated` to all participants.

---

### Server → Client events

#### `chat:joined`

Confirms successful room join.

**Payload**

```json
{ "conversationId": "conv_abc123" }
```

---

#### `chat:message:new`

New message (text or voice) received in a conversation.

**Payload**

```json
{
  "id": "msg_...",
  "conversationId": "conv_abc123",
  "type": "TEXT",
  "body": "Hello!",
  "sentAt": "2026-04-26T10:00:00Z",
  "deletedAt": null,
  "sender": { "id": "...", "displayName": "Alice", "avatarUrl": "..." },
  "voiceRecording": null
}
```

For VOICE type, `body` is `null` and `voiceRecording` is:

```json
{ "id": "...", "filePath": "/uploads/...", "durationSeconds": 42, "mimeType": "audio/webm" }
```

---

#### `chat:message:status`

Per-message read/delivery status update.

**Payload**

```json
{
  "messageId": "msg_...",
  "conversationId": "conv_abc123",
  "statuses": [{ "userId": "...", "status": "READ", "readAt": "2026-04-26T10:01:00Z" }]
}
```

---

#### `chat:message:deleted`

A message was soft-deleted.

**Payload**

```json
{
  "messageId": "msg_...",
  "conversationId": "conv_abc123",
  "deletedAt": "2026-04-26T10:05:00Z"
}
```

---

#### `chat:typing:update`

A participant's typing state changed.

**Payload**

```json
{
  "conversationId": "conv_abc123",
  "userId": "...",
  "isTyping": true
}
```

---

#### `chat:presence:update`

A participant's online/offline status changed.  
Emitted to all rooms the participant shares with other users.

**Payload**

```json
{
  "userId": "...",
  "presenceStatus": "ONLINE"
}
```

---

#### `chat:board:updated`

A conversation's Kanban column changed.

**Payload**

```json
{
  "conversationId": "conv_abc123",
  "boardStatus": "AWAITING_REPLY"
}
```

---

#### `chat:error`

Emitted to the originating client when a server-side error occurs during event handling.

**Payload**

```json
{ "event": "chat:message:send", "error": "NOT_PARTICIPANT" }
```

---

## Namespace: `/calls`

### Client → Server events

#### `call:initiate`

Initiate a call. Server records the session as RINGING and notifies the recipient.

**Payload**

```json
{
  "callSessionId": "call_...",
  "recipientId": "userId2",
  "type": "VIDEO"
}
```

**Server emits** `call:incoming` to recipient.

---

#### `call:accept`

Recipient accepts an incoming call.

**Payload**

```json
{ "callSessionId": "call_..." }
```

**Server emits** `call:accepted` to initiator.

---

#### `call:decline`

Recipient declines an incoming call.

**Payload**

```json
{ "callSessionId": "call_..." }
```

**Server emits** `call:declined` to initiator; updates session status to DECLINED.

---

#### `call:signal`

Relay a WebRTC signal (SDP offer, SDP answer, or ICE candidate) between peers.

**Payload**

```json
{
  "callSessionId": "call_...",
  "to": "userId2",
  "signal": {
    /* opaque simple-peer signal object */
  }
}
```

**Server emits** `call:signal` to target user.

---

#### `call:end`

Either party ends an active call.

**Payload**

```json
{ "callSessionId": "call_..." }
```

**Server emits** `call:ended` to the other party; updates session status to ENDED.

---

### Server → Client events

#### `call:incoming`

Incoming call notification delivered to the recipient.

**Payload**

```json
{
  "callSessionId": "call_...",
  "type": "VIDEO",
  "initiator": { "id": "...", "displayName": "Alice", "avatarUrl": "..." }
}
```

---

#### `call:accepted`

Delivered to the initiator when the recipient accepts.

**Payload**

```json
{
  "callSessionId": "call_...",
  "recipient": { "id": "...", "displayName": "Bob" }
}
```

---

#### `call:declined`

Delivered to the initiator when the recipient declines.

**Payload**

```json
{ "callSessionId": "call_..." }
```

---

#### `call:signal`

Relay of a WebRTC signal from the remote peer.

**Payload**

```json
{
  "callSessionId": "call_...",
  "from": "userId1",
  "signal": {
    /* opaque simple-peer signal object */
  }
}
```

---

#### `call:ended`

Delivered to the non-ending party when the call is terminated.

**Payload**

```json
{ "callSessionId": "call_..." }
```

---

#### `call:busy`

Delivered to the initiator when the recipient is already in an active call.

**Payload**

```json
{ "callSessionId": "call_...", "recipientId": "userId2" }
```

---

## Connection / Authentication

**Client connection example**:

```typescript
import { io } from "socket.io-client";

const chatSocket = io("/chat", {
  auth: { token: accessToken },
  withCredentials: true,
});

const callsSocket = io("/calls", {
  auth: { token: accessToken },
  withCredentials: true,
});
```

If the token is invalid or expired, the server calls `next(new Error('Unauthorized'))` and
the client receives a `connect_error` event. The client must refresh the access token and
reconnect.

---

## Event Rate Limits (Server-Enforced)

| Event               | Limit                                        |
| ------------------- | -------------------------------------------- |
| `chat:message:send` | 10 messages / 10 s per socket                |
| `chat:typing:start` | 1 event / 300 ms per socket per conversation |
| `call:signal`       | 100 events / 10 s per socket                 |
