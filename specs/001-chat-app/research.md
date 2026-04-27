# Research: Real-Time Chat Application

**Feature**: 001-chat-app | **Phase**: 0 | **Date**: 2026-04-26

---

## R1 — JWT Authentication Strategy

**Decision**: Custom NestJS Guard using `jsonwebtoken` directly (no Passport); access tokens
in httpOnly + Secure + SameSite=Strict cookies; refresh token rotation with DB hash storage;
password hashing with Argon2id.

**Rationale**:

- `jsonwebtoken` without Passport removes a dependency layer and gives full control over
  verification logic; the guard sets `request.user` from the payload.
- httpOnly cookies prevent XSS access to tokens (primary browser threat); SameSite=Strict
  prevents CSRF without needing a separate CSRF token on a same-origin SPA.
- Refresh token rotation: store a hash of the refresh token in a `RefreshTokenSession`
  Prisma model; rotate on every use; invalidate all sessions on logout.
- Short access token expiry (15 min) is the primary revocation mechanism; a DB blocklist is
  only checked on logout/suspicious activity — avoids per-request DB overhead.
- Argon2id (64 MB memory, 3 iterations, 4 parallelism) is NIST/OWASP-recommended and
  GPU-resistant; bcrypt is acceptable but weaker for new projects.

**Alternatives considered**:

- Passport.js — rejected: unnecessary abstraction for a custom JWT-only flow.
- localStorage token storage — rejected: vulnerable to XSS; httpOnly cookie is standard.
- Redis blocklist — deferred: overkill for v1; simple DB table with indexed `expiresAt` is
  sufficient and keeps the infrastructure simpler.

---

## R2 — WebRTC Signalling Architecture (simple-peer + NestJS)

**Decision**: simple-peer with trickle ICE on the frontend; NestJS `calls` namespace gateway
relays signals via direct socket-to-socket emit (not rooms); call state managed as a
frontend state machine; Google STUN servers for v1 (no TURN infra required initially).

**Rationale**:

- simple-peer abstracts SDP offer/answer negotiation; the signalling server only needs to
  relay opaque `signal` payloads between two socket IDs — no SDP parsing in the backend.
- Trickle ICE is the default in simple-peer; it allows connection setup before all ICE
  candidates are gathered, reducing time-to-connect.
- Direct unicast (`io.to(socketId).emit`) is correct for 1-on-1 signalling; socket.io rooms
  are unnecessary overhead for peer-to-peer pairing.
- Call state machine lives entirely on the frontend (`idle → ringing → connecting → active
→ ended/declined/failed`); the gateway stores a `userId → socketId` map but no call
  session state in memory (sessions are written to DB by the REST layer).
- Google STUN (`stun.l.google.com:19302`) covers ~85 % of network topologies; a TURN relay
  can be added in v2 if connectivity issues arise in carrier-grade NAT environments.

**Signalling event sequence**:

```
Caller:   call:initiate → gateway → Recipient: call:incoming
Recipient: call:accept  → gateway → Caller:    call:accepted
Both:     call:signal   → gateway → Both:      call:signal   (trickle ICE + SDP)
Either:   call:end      → gateway → Other:     call:ended
Recipient: call:decline → gateway → Caller:    call:declined
```

**Alternatives considered**:

- mediasoup / Janus (SFU) — rejected: overkill for 1-on-1; adds significant infra complexity.
- Rooms for signalling — rejected: unicast is semantically correct and simpler.
- Hosting a TURN server in v1 — deferred: public STUN is sufficient for MVP.

---

## R3 — socket.io Gateway Architecture

**Decision**: Two NestJS WebSocket gateways sharing a single namespace (`/chat`) for
messages, typing, and presence; a separate `/calls` namespace for call signalling. JWT
is validated in socket.io middleware (once per connection); `socket.data.userId` carries
identity for all subsequent events. Each conversation is a socket.io room
(`conversation:{id}`); each user has a private room (`user:{id}`).

**Rationale**:

- Two namespaces rather than five keeps the connection count low (one WebSocket per
  namespace per client tab) while still separating the call signalling concern — which has
  different payload shapes, lifecycle, and error handling requirements.
- Validating JWT in the socket.io `use` middleware (connection phase) is efficient:
  the token is verified once and the userId stored in `socket.data`; no per-event re-verification.
- Conversation rooms (`conversation:{id}`) enable efficient scoped broadcasts for new
  messages, typing indicators, and presence updates — only participants receive events, not
  all connected users.
- Client-side typing debounce (300 ms) + server-side rate-limiting prevents indicator event
  floods; typing state is never persisted to DB.
- Presence updates (`userOnline` / `userOffline`) are broadcast only within conversation
  rooms, not globally — respects privacy and scales cleanly.

**Alternatives considered**:

- Five separate namespaces (one per feature) — rejected: doubles connection overhead for
  minimal architectural gain at v1 scale.
- Global presence broadcast — rejected: privacy violation; scales poorly with user growth.
- Persisting typing state to DB — rejected: ephemeral data; wastes write IOPS.

---

## R4 — Kanban Board Column Definition

**Decision**: Fixed system columns — three predefined statuses: **Active**, **Awaiting Reply**,
**Resolved**.

**Rationale**:

- Eliminates a column management UI and CRUD API surface (create, rename, reorder, delete).
- Simplifies the Prisma schema: `Conversation.boardStatus` is a PostgreSQL enum with three
  values (`ACTIVE`, `AWAITING_REPLY`, `RESOLVED`).
- Delivers the full Kanban workflow value for v1 — users can categorise and manage
  conversations — without building a meta-management layer.
- Can be upgraded to user-defined columns in v2 by migrating the enum to a `BoardColumn`
  relational table.

**Alternatives considered**:

- User-defined columns — deferred to v2: high scope, requires its own CRUD module.
- Hybrid (rename only) — also deferred; fixed labels are sufficient and familiar (mirrors
  common support-desk board conventions).

---

## R5 — Voice Message Storage

**Decision**: Encode audio as WebM/Opus in the browser (MediaRecorder API default), upload
as multipart to a NestJS REST endpoint (`POST /conversations/:id/messages/voice`), store
the file on the local filesystem (dev) or a configurable object storage path (prod). The
`VoiceRecording` Prisma model stores the file path/URL, duration, and MIME type. Serve
via a signed URL or static route with auth middleware.

**Rationale**:

- MediaRecorder in modern browsers defaults to `audio/webm;codecs=opus` — no frontend
  transcoding needed.
- REST upload (not socket) is correct for binary payloads; sockets are for real-time
  small-payload signalling.
- Filesystem storage is simplest for v1 and avoids a separate S3/object-store dependency;
  the NestJS `FileInterceptor` (Multer) handles multipart parsing with size validation.
- 2-minute maximum = ~2 MB at 128 kbps Opus — trivial for Multer memory buffering.

**Alternatives considered**:

- Uploading audio via socket (base64 chunks) — rejected: inefficient, no progress, no
  resume, poor browser support for large binary sockets.
- S3/object storage in v1 — deferred: adds AWS SDK dependency and IAM config; local
  filesystem is adequate for MVP.

---

## Summary of Decisions

| #   | Area      | Decision                                                              |
| --- | --------- | --------------------------------------------------------------------- |
| R1  | Auth      | Custom JWT guard, httpOnly cookies, Argon2id, refresh rotation via DB |
| R2  | WebRTC    | simple-peer trickle ICE, direct socket relay, Google STUN only        |
| R3  | WebSocket | `/chat` + `/calls` namespaces, conversation rooms, JWT middleware     |
| R4  | Kanban    | Fixed 3 columns: Active / Awaiting Reply / Resolved                   |
| R5  | Voice     | WebM/Opus, REST multipart upload, filesystem storage, Multer          |
