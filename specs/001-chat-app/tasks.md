---
description: "Task list for Real-Time Chat Application implementation"
---

# Tasks: Real-Time Chat Application

**Input**: Design documents from `specs/001-chat-app/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: TDD is required per Constitution Principle IV. Test tasks are included for all critical logic.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize both projects, configure tooling, and establish the shared foundation.

- [x] T001 Initialize NestJS backend project with TypeScript strict mode in `backend/` (`nest new backend --strict`)
- [x] T002 [P] Initialize React + Vite frontend project with TypeScript strict mode in `frontend/` (`npm create vite@latest frontend -- --template react-ts`)
- [x] T003 Configure backend ESLint + Prettier in `backend/.eslintrc.js` and `backend/.prettierrc`
- [x] T004 [P] Configure frontend ESLint + Prettier in `frontend/.eslintrc.js` and `frontend/.prettierrc`
- [x] T005 Add `backend/.env.example` with all required env vars: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR`, `MAX_VOICE_SIZE_BYTES`
- [x] T006 [P] Add `frontend/.env.example` with `VITE_API_BASE_URL` and `VITE_SOCKET_URL`
- [x] T007 Install backend dependencies in `backend/`: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `jsonwebtoken`, `argon2`, `simple-peer`, `multer`, `class-validator`, `class-transformer`; dev: `@types/jsonwebtoken`, `@types/multer`, `@types/simple-peer`
- [x] T008 [P] Install frontend dependencies in `frontend/`: `react-router-dom`, `antd`, `@ant-design/icons`, `axios`, `socket.io-client`, `simple-peer`; dev: `@types/simple-peer`
- [x] T009 Install and configure Prisma in `backend/`: `npm install prisma @prisma/client`; run `npx prisma init`; set `DATABASE_URL` in `backend/.env`
- [x] T010 Write complete Prisma schema in `backend/prisma/schema.prisma` with all 7 models: `User`, `RefreshTokenSession`, `Conversation`, `ConversationParticipant`, `Message`, `MessageReadStatus`, `VoiceRecording`, `CallSession` — exactly as specified in `specs/001-chat-app/data-model.md`
- [x] T011 Run `npx prisma migrate dev --name init` from `backend/` to create the initial migration and generate Prisma client
- [x] T012 Create `backend/src/prisma/prisma.service.ts` exporting `PrismaService extends PrismaClient` with `onModuleInit` connect and `enableShutdownHooks`; create `backend/src/prisma/prisma.module.ts` as a global module
- [x] T013 [P] Create `backend/src/common/filters/http-exception.filter.ts` implementing NestJS `ExceptionFilter` for all `HttpException`s — returns `{ error, message, fields? }` shape from `contracts/rest-api.md`
- [x] T014 [P] Create `backend/src/common/interceptors/transform.interceptor.ts` for consistent response wrapping
- [x] T015 Register global exception filter and interceptor in `backend/src/main.ts`; configure CORS for `CORS_ORIGIN`; enable `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- [x] T016 [P] Create `frontend/src/shared/services/api.ts` — axios instance with `baseURL` from `VITE_API_BASE_URL`, `withCredentials: true`, and a response interceptor that emits `401` events for token expiry

**Checkpoint**: Both projects start (`npm run start:dev` / `npm run dev`), linters pass, Prisma schema migrates, and the axios instance is configured.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story work begins.

- [x] T017 Create `backend/src/common/guards/jwt.guard.ts` — custom `CanActivate` guard using `jsonwebtoken.verify` with `JWT_ACCESS_SECRET`; reads token from `request.cookies.accessToken`; sets `request.user = { userId, email }`; throws `UnauthorizedException` on failure
- [x] T018 [P] Create `backend/src/common/guards/ws-auth.guard.ts` — socket.io middleware factory that verifies `socket.handshake.auth.token`; stores `userId` in `socket.data.userId`; calls `next(new Error('Unauthorized'))` on failure
- [x] T019 Create `backend/src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` param decorator extracting `request.user` from the execution context
- [x] T020 [P] Create `frontend/src/shared/hooks/useSocket.ts` — React hook that creates and memoises socket.io-client connections to `/chat` and `/calls` namespaces; reads token from auth context; handles `connect_error` for 401 (triggers refresh); exports `chatSocket` and `callsSocket`
- [x] T021 [P] Create `frontend/src/shared/types/index.ts` with TypeScript interfaces matching all API response shapes from `contracts/rest-api.md`: `User`, `Conversation`, `Message`, `VoiceRecording`, `CallSession`, `MessageReadStatus`, error shapes
- [x] T022 Create `frontend/src/app/providers.tsx` — root providers: React Router `BrowserRouter`, Ant Design `ConfigProvider` with theme tokens and RTL/LTR direction support via `direction` prop; `AuthProvider`

**Checkpoint**: Guards compile; socket hook initialises without errors; shared types and providers render correctly.

---

## Phase 3: User Story 1 — Account Registration & Authentication (Priority: P1) 🎯 MVP

**Goal**: Users can register, log in, update their profile, and log out. Sessions are secured with JWT cookies. This phase delivers the standalone identity layer.

**Independent Test**: Register a new user via `POST /auth/register`, log in via `POST /auth/login`, call `GET /users/me`, and log out via `POST /auth/logout` — all return correct responses; cookies are set and cleared; duplicate email returns 409.

### Backend

- [x] T023 [US1] Create `backend/src/auth/dto/register.dto.ts` with `email` (IsEmail, MaxLength 254), `password` (IsString, MinLength 8, MaxLength 128), `displayName` (IsString, MinLength 1, MaxLength 60)
- [x] T024 [P] [US1] Create `backend/src/auth/dto/login.dto.ts` with `email` (IsEmail) and `password` (IsString, MinLength 8)
- [x] T025 [US1] Create `backend/src/auth/auth.service.ts` with methods: `register(dto)` — hash password with Argon2id (memoryCost 65540, timeCost 3, parallelism 4), create User via Prisma, issue token pair; `login(dto)` — find user by email, verify password with `argon2.verify`, issue token pair; `logout(userId, refreshToken)` — invalidate session; `refresh(refreshToken)` — validate hash, rotate token pair
- [x] T026 [US1] Create `backend/src/auth/token.service.ts` with methods: `issueAccessToken(userId, email): string` — signs with `JWT_ACCESS_SECRET`, expiry from env; `issueRefreshToken(userId): string` — signs with `JWT_REFRESH_SECRET`, stores SHA-256 hash in `RefreshTokenSession` via Prisma; `rotateRefreshToken(oldToken): { accessToken, refreshToken }` — validate old hash, invalidate, issue new pair
- [x] T027 [US1] Create `backend/src/auth/auth.controller.ts` with routes: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` (🔒 JwtGuard), `POST /auth/refresh` — all set/clear `accessToken` and `refreshToken` httpOnly + Secure + SameSite=Strict cookies per `contracts/rest-api.md`
- [x] T028 [P] [US1] Create `backend/src/auth/auth.module.ts` importing `PrismaModule`; register `AuthService`, `TokenService`, `AuthController`
- [x] T029 [P] [US1] Create `backend/src/users/users.service.ts` with: `findById(id)`, `findByEmail(email)`, `updateProfile(id, dto)` — updates `displayName` and/or `avatarUrl`; `updatePresence(id, status)` — sets `ONLINE`/`OFFLINE`
- [x] T030 [P] [US1] Create `backend/src/users/dto/update-profile.dto.ts` with optional `displayName` and `avatarUrl`; create `backend/src/users/users.controller.ts` with `GET /users/me` (🔒), `PATCH /users/me` (🔒), `GET /users/search?q=&limit=` (🔒) per `contracts/rest-api.md`
- [x] T031 [P] [US1] Create `backend/src/users/users.module.ts`; register `UsersService` and `UsersController`

### Frontend

- [x] T032 [US1] Create `frontend/src/features/auth/AuthContext.tsx` — React context with `user: User | null`, `login(email, password)`, `register(email, password, displayName)`, `logout()`, `refreshToken()` methods; persists user in memory (no localStorage); on mount calls `GET /users/me` to restore session from cookie
- [x] T033 [P] [US1] Create `frontend/src/features/auth/RegisterPage.tsx` — Ant Design `Form` with email, password, displayName fields; calls `AuthContext.register`; redirects to `/` on success; shows field-level validation errors from API
- [x] T034 [P] [US1] Create `frontend/src/features/auth/LoginPage.tsx` — Ant Design `Form` with email and password; calls `AuthContext.login`; redirects to `/` on success; shows error message on 401
- [x] T035 [P] [US1] Create `frontend/src/app/ProtectedRoute.tsx` — wraps routes that require auth; redirects to `/login` if `AuthContext.user` is null
- [x] T036 [P] [US1] Create `frontend/src/app/router.tsx` — React Router routes: `/login` → `LoginPage`, `/register` → `RegisterPage`, `/` → `ProtectedRoute` wrapping `AppShell`
- [x] T037 [P] [US1] Create `frontend/src/features/profile/ProfilePage.tsx` — form to update `displayName` and `avatarUrl`; calls `PATCH /users/me`; shows Ant Design success/error notifications

### Tests

- [x] T038 [US1] Write unit tests in `backend/src/auth/auth.service.spec.ts`: register hashes password with Argon2id, throws 409 on duplicate email; login returns tokens on correct credentials, throws 401 on wrong password; logout invalidates session; refresh rotates token and invalidates old hash
- [x] T039 [P] [US1] Write e2e test in `backend/test/e2e/auth.e2e-spec.ts` covering the full register → login → GET /users/me → logout flow using Supertest

---

## Phase 4: User Story 2 — Real-Time Text Messaging (Priority: P2)

**Goal**: Authenticated users create and participate in conversations, exchange text messages in real time with delivery/read status, and see typing indicators and unread badges.

**Independent Test**: Two users in separate browser sessions open a direct conversation and exchange text messages — messages appear for both within 1 second; read status updates; unread badge appears in conversation list.

### Backend

- [x] T040 [US2] Create `backend/src/conversations/dto/create-conversation.dto.ts` with `type` (IsEnum ConversationType), `participantIds` (IsArray, IsString each, ArrayMinSize 1), optional `name` (for GROUP); create `backend/src/conversations/conversations.service.ts` with: `create(userId, dto)` — validates DIRECT uniqueness, creates Conversation + ConversationParticipant rows; `findAllForUser(userId)` — returns conversations with last message and unread count; `findOne(id, userId)` — verifies participant; `updateBoardStatus(id, userId, status)`
- [x] T041 [P] [US2] Create `backend/src/conversations/conversations.controller.ts` with routes: `GET /conversations`, `POST /conversations`, `GET /conversations/:id`, `PATCH /conversations/:id/board-status` — all 🔒 JwtGuard per `contracts/rest-api.md`; create `backend/src/conversations/conversations.module.ts`
- [x] T042 [US2] Create `backend/src/messages/messages.service.ts` with: `findPaginated(conversationId, userId, before?, limit)` — cursor-based pagination by `sentAt`; `create(conversationId, senderId, body)` — creates Message, creates MessageReadStatus rows for all participants with status DELIVERED, updates `Conversation.lastActivityAt`; `markRead(conversationId, userId, upToMessageId)` — updates MessageReadStatus rows to READ; `softDelete(messageId, userId)` — sets `deletedAt`
- [x] T043 [P] [US2] Create `backend/src/messages/messages.controller.ts` with routes: `GET /conversations/:id/messages`, `DELETE /conversations/:id/messages/:messageId` — all 🔒 per `contracts/rest-api.md`; create `backend/src/messages/messages.module.ts`
- [x] T044 [US2] Create `backend/src/messages/chat.gateway.ts` — `@WebSocketGateway({ namespace: '/chat' })` with socket.io JWT middleware (uses `WsAuthGuard`); handles events: `chat:join` (socket joins `conversation:{id}` room, emits `chat:joined`), `chat:leave`, `chat:message:send` (calls `MessagesService.create`, broadcasts `chat:message:new` to room), `chat:message:read` (calls `MessagesService.markRead`, broadcasts `chat:message:status`), `chat:typing:start` / `chat:typing:stop` (broadcasts `chat:typing:update` to room excluding sender), `chat:board:move` (calls `ConversationsService.updateBoardStatus`, broadcasts `chat:board:updated`); on `handleConnection` emits `chat:presence:update` ONLINE to user's conversation rooms; on `handleDisconnect` emits OFFLINE
- [x] T045 [P] [US2] Add rate limiting in `chat.gateway.ts`: `chat:message:send` max 10/10 s per socket; `chat:typing:start` max 1/300 ms per socket per conversation — implement as an in-memory map on the gateway instance

### Frontend

- [x] T046 [US2] Create `frontend/src/shared/services/conversations.service.ts` with functions wrapping axios: `getConversations()`, `createConversation(dto)`, `getConversation(id)`, `updateBoardStatus(id, status)`; create `frontend/src/shared/services/messages.service.ts` with `getMessages(conversationId, before?, limit)`, `deleteMessage(conversationId, messageId)`, `uploadVoiceMessage(conversationId, blob)`
- [x] T047 [P] [US2] Create `frontend/src/features/conversations/ConversationList.tsx` — Ant Design `List` of conversation items sorted by `lastActivityAt`; each item shows avatar, display name/group name, last message preview, timestamp, unread `Badge` count; clicking opens `ChatView`; updates in real time from `chat:message:new` socket event
- [x] T048 [US2] Create `frontend/src/features/chat/ChatView.tsx` — main conversation panel; loads message history via `MessagesService.getMessages` with infinite scroll (load older messages on scroll to top); subscribes to `chat:message:new`, `chat:message:status`, `chat:message:deleted`, `chat:typing:update` socket events on mount (emits `chat:join`); emits `chat:leave` on unmount
- [x] T049 [P] [US2] Create `frontend/src/features/chat/MessageBubble.tsx` — renders a single message: text body or "Message deleted" if `deletedAt` is set; shows sender avatar, timestamp, delivery/read status icons (sent ✓, delivered ✓✓, read ✓✓ in blue); supports delete action for own messages (calls `MessagesService.deleteMessage`, updates local state on `chat:message:deleted` event)
- [x] T050 [P] [US2] Create `frontend/src/features/chat/MessageInput.tsx` — Ant Design `Input` with send button; on input change emits `chat:typing:start` (debounced 300 ms) then `chat:typing:stop`; on submit emits `chat:message:send`; clears input after send
- [x] T051 [P] [US2] Create `frontend/src/features/chat/TypingIndicator.tsx` — displays "Alice is typing…" when `chat:typing:update` event arrives with `isTyping: true`; auto-clears after 5 s if no `chat:typing:stop` received
- [x] T052 [P] [US2] Create `frontend/src/features/conversations/NewConversationModal.tsx` — Ant Design `Modal` with user search input (calls `GET /users/search`), selects one user for DIRECT or multiple for GROUP, submits `POST /conversations`

### Tests

- [x] T053 [US2] Write unit tests in `backend/src/messages/messages.service.spec.ts`: `create` persists message and creates read statuses; `markRead` updates status to READ; `findPaginated` returns cursor-paginated results
- [x] T054 [P] [US2] Write unit tests in `backend/src/messages/chat.gateway.spec.ts`: `chat:message:send` broadcasts `chat:message:new` to correct room; `chat:typing:start` emits `chat:typing:update` to room excluding sender; unauthenticated socket is rejected

---

## Phase 5: User Story 3 — Conversation Workspace Views: List & Kanban (Priority: P3)

**Goal**: Users can switch between a chronological list view and a Kanban board view showing conversations in three fixed columns (Active, Awaiting Reply, Resolved). Board status persists and updates in real time.

**Independent Test**: A user with 3+ conversations in different board statuses can view the board, drag a card to a different column, refresh the page, and see the persisted status. The `chat:board:updated` event updates the board in real time for all participants.

### Backend

- [x] T055 [US3] Create `backend/src/board/board.service.ts` wrapping `ConversationsService.updateBoardStatus`; validates that `boardStatus` is one of `ACTIVE | AWAITING_REPLY | RESOLVED`; already exposed via `PATCH /conversations/:id/board-status` in T041 — confirm endpoint handles enum validation and returns 400 for invalid values
- [x] T056 [P] [US3] Verify `chat.gateway.ts` `chat:board:move` handler (T044) broadcasts `chat:board:updated` to all `conversation:{id}` room participants including the initiator — add test in `backend/src/messages/chat.gateway.spec.ts`

### Frontend

- [x] T057 [US3] Create `frontend/src/features/conversations/WorkspaceLayout.tsx` — top-level layout with a view toggle (List | Board) using Ant Design `Segmented` control; renders `ConversationList` or `BoardView` based on selection; persists selected view in `localStorage`
- [x] T058 [US3] Create `frontend/src/features/board/BoardView.tsx` — three-column Kanban layout using Ant Design `Card` components in a flex/grid row; columns are **Active**, **Awaiting Reply**, **Resolved**; renders `ConversationCard` in each column by filtering `conversations` by `boardStatus`; subscribes to `chat:board:updated` socket event and updates local state
- [x] T059 [US3] Create `frontend/src/features/board/ConversationCard.tsx` — draggable card (HTML5 drag-and-drop) showing conversation name/participants, unread badge, last message preview, and timestamp; on `dragend` over a different column calls `updateBoardStatus(id, newStatus)` via REST, then emits `chat:board:move` over socket for real-time peer update; shows Ant Design loading spinner during the update
- [x] T060 [P] [US3] Create `frontend/src/features/board/useBoard.ts` — custom hook that derives board column arrays from the conversations list, handles `chat:board:updated` socket event to update state without a full refresh, and exposes `moveCard(id, newStatus)` action

---

## Phase 6: User Story 4 — Voice Messages (Priority: P4)

**Goal**: Users can record a WebM/Opus voice clip (up to 2 minutes), send it as a message, and recipients can play it inline.

**Independent Test**: User A opens a conversation, records a 10-second voice message, sends it. User B sees the voice message bubble, presses play, and hears the audio. After page refresh, the message is still present and playable.

### Backend

- [x] T061 [US4] Create `backend/src/voice/voice.service.ts` with `upload(file: Express.Multer.File, conversationId, senderId)` — validates MIME type (`audio/webm`, `audio/ogg`, `audio/mp4`), validates `durationSeconds ≤ 120` (read from multipart field), validates `sizeBytes ≤ MAX_VOICE_SIZE_BYTES`, saves file to `UPLOAD_DIR/{conversationId}/{uuid}.webm`, creates `VoiceRecording` + `Message(type: VOICE)` via Prisma, updates `Conversation.lastActivityAt`, broadcasts `chat:message:new` via ChatGateway
- [x] T062 [P] [US4] Create `backend/src/voice/voice.controller.ts` — `POST /conversations/:id/messages/voice` (🔒) using NestJS `FileInterceptor('audio', { limits: { fileSize: MAX_VOICE_SIZE_BYTES } })`; delegate to `VoiceService.upload`; create `backend/src/voice/voice.module.ts`
- [x] T063 [P] [US4] Add static file serving in `backend/src/main.ts`: `app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads' })` with JwtGuard middleware applied to `/uploads/*` routes so audio files require auth to access

### Frontend

- [x] T064 [US4] Create `frontend/src/features/chat/VoiceRecorder.tsx` — hold-to-record button using browser `MediaRecorder` API (`audio/webm;codecs=opus`); shows recording timer; enforces 2-minute max (auto-stops); on release calls `MessagesService.uploadVoiceMessage(conversationId, blob)` via multipart POST; shows cancel button during recording to discard; handles `NotAllowedError` microphone permission denial with Ant Design error notification
- [x] T065 [P] [US4] Create `frontend/src/features/chat/VoiceMessagePlayer.tsx` — renders an inline audio player for voice messages: `<audio>` element with play/pause button, progress bar, and duration display; loads `src` from `voiceRecording.filePath`; handles loading and error states
- [x] T066 [P] [US4] Update `MessageBubble.tsx` (T049) to render `VoiceMessagePlayer` when `message.type === 'VOICE'`

### Tests

- [x] T067 [US4] Write unit tests in `backend/src/voice/voice.service.spec.ts`: rejects files exceeding size limit; rejects invalid MIME types; rejects duration > 120 s; saves file and creates VoiceRecording + Message rows on valid input

---

## Phase 7: User Story 5 — Audio & Video Calls (Priority: P5)

**Goal**: Users can initiate 1-on-1 audio or video calls; recipient sees an incoming call notification; both parties connect via WebRTC (simple-peer); either party can end the call.

**Independent Test**: User A initiates a video call to User B. User B sees the `call:incoming` notification with accept/decline. On accept, both camera feeds appear. Either user clicks End; the call terminates for both. Call session status is persisted in DB.

### Backend

- [x] T068 [US5] Create `backend/src/calls/calls.service.ts` with: `initiateCall(initiatorId, conversationId, recipientId, type)` — verifies recipient is not in an active call (queries `CallSession` with status `RINGING` or `ACTIVE`), creates `CallSession(status: RINGING)`, returns session; `updateStatus(callId, userId, status)` — validates transition, updates DB; `getUserActiveCallSession(userId)` — finds RINGING or ACTIVE session for busy check
- [x] T069 [P] [US5] Create `backend/src/calls/calls.controller.ts` — `POST /conversations/:id/calls` (🔒): calls `CallsService.initiateCall`, returns `{ callSessionId }`; `PATCH /conversations/:id/calls/:callId` (🔒): calls `CallsService.updateStatus`; create `backend/src/calls/calls.module.ts`
- [x] T070 [US5] Create `backend/src/calls/calls.gateway.ts` — `@WebSocketGateway({ namespace: '/calls' })` with JWT middleware; maintains a `userId → socketId` map in memory; handles: `call:initiate` → verifies recipient socket exists, if not emit `call:busy`; emits `call:incoming` to recipient's socket; `call:accept` → emits `call:accepted` to initiator; `call:decline` → emits `call:declined` to initiator, updates DB; `call:signal` → relays signal payload to target socket (`io.to(targetSocketId).emit('call:signal', ...)`); `call:end` → emits `call:ended` to other party, updates DB; on `handleDisconnect` if user was in a call, emit `call:ended` to other party

### Frontend

- [x] T071 [US5] Create `frontend/src/shared/hooks/useCall.ts` — manages call state machine (`idle | ringing | connecting | active | ended`); subscribes to `call:incoming`, `call:accepted`, `call:accepted`, `call:signal`, `call:ended`, `call:declined`, `call:busy` socket events; exposes `initiateCall(conversationId, recipientId, type)`, `acceptCall()`, `declineCall()`, `endCall()`, `localStream`, `remoteStream`; creates and destroys `simple-peer` instance; configures with Google STUN (`stun:stun.l.google.com:19302`)
- [x] T072 [US5] Create `frontend/src/features/calls/IncomingCallModal.tsx` — full-screen Ant Design `Modal` overlay shown when `callState === 'ringing'` (incoming); displays caller name, avatar, call type (audio/video icon); Accept and Decline buttons; maps to `useCall.acceptCall()` and `useCall.declineCall()`
- [x] T073 [P] [US5] Create `frontend/src/features/calls/CallView.tsx` — active call UI shown when `callState === 'active'`; for VIDEO: two `<video>` elements (`localStream` muted, `remoteStream`); for AUDIO: audio visualiser or waveform placeholder; End Call button maps to `useCall.endCall()`; mute toggle; shows call duration timer
- [x] T074 [P] [US5] Create `frontend/src/features/calls/OutgoingCallOverlay.tsx` — shown when `callState === 'ringing'` (outgoing); displays recipient name, "Calling…" spinner, Cancel button
- [x] T075 [P] [US5] Update `frontend/src/features/chat/ChatView.tsx` — add "Start Audio Call" and "Start Video Call" buttons in the conversation header; calls `useCall.initiateCall(conversationId, recipientId, callType)` which first creates session via `POST /conversations/:id/calls` then emits `call:initiate` over socket; show unobtrusive Ant Design `notification` for new messages arriving during an active call

### Tests

- [x] T076 [US5] Write unit tests in `backend/src/calls/calls.service.spec.ts`: `initiateCall` throws 409 when recipient is in active call; `updateStatus` enforces valid transitions; `getUserActiveCallSession` returns correct session
- [x] T077 [P] [US5] Write unit tests in `backend/src/calls/calls.gateway.spec.ts`: `call:signal` relays to correct socket ID; `call:initiate` emits `call:busy` when recipient already in call; disconnect during active call emits `call:ended` to other party

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, responsiveness, RTL, empty states, error boundaries, and performance optimisations.

- [x] T078 [P] Add Ant Design `ConfigProvider` RTL support in `frontend/src/app/providers.tsx`: read `dir` from `document.documentElement.dir` or a user preference stored in `localStorage`; pass `direction: 'rtl' | 'ltr'` to `ConfigProvider`; verify layout mirrors correctly in both directions
- [x] T079 [P] Add React `ErrorBoundary` component in `frontend/src/shared/components/ErrorBoundary.tsx`; wrap main feature areas in `AppShell` with it; display Ant Design `Result` error page with retry option
- [x] T080 [P] Apply `React.lazy` + `Suspense` code splitting in `frontend/src/app/router.tsx` for `RegisterPage`, `LoginPage`, `ChatView`, `BoardView`, `CallView`, `ProfilePage` — each feature loads its JS chunk on demand
- [x] T081 [P] Add empty-state UI in `frontend/src/features/conversations/ConversationList.tsx`: when `conversations.length === 0`, render Ant Design `Empty` component with a "Start your first conversation" CTA button opening `NewConversationModal`
- [x] T082 [P] Add Ant Design `Skeleton` loading placeholders in `ConversationList.tsx` and `ChatView.tsx` while initial data fetches are in progress
- [x] T083 [P] Add network reconnection handling in `frontend/src/shared/hooks/useSocket.ts`: on `disconnect` event show an Ant Design `message.loading("Reconnecting…")`; on `connect` dismiss it and re-join active conversation rooms
- [x] T084 [P] Add message send retry in `frontend/src/features/chat/MessageInput.tsx`: if `chat:message:send` fails (socket not connected), queue the message and retry on reconnect; show "Sending…" indicator per SC-008
- [x] T085 [P] Add ARIA attributes to all interactive components: `role`, `aria-label` on icon-only buttons (mute, end call, record, send), `aria-live="polite"` on `TypingIndicator.tsx`, `aria-label` on unread count badges
- [x] T086 [P] Verify responsive layout at 375 px, 768 px, 1280 px, 2560 px breakpoints: `ConversationList` collapses to a slide-out drawer on mobile; `CallView` stacks video elements vertically on small screens; `BoardView` becomes horizontally scrollable on mobile
- [x] T087 [P] Add `backend/src/common/tasks/cleanup.service.ts` — NestJS `@Cron` task (daily) deleting `RefreshTokenSession` rows where `expiresAt < now()` or `isValid = false`

---

## Dependency Graph (Story Completion Order)

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundation: guards, socket hook, types, providers)
    │
    ▼
Phase 3 (US1: Auth) ◄── MVP boundary — independently testable and deployable
    │
    ▼
Phase 4 (US2: Messaging) ◄── requires auth; adds conversations, text messages, socket gateway
    │
    ├──► Phase 5 (US3: Board views) ◄── requires conversations to exist; board status on Conversation model
    │
    ├──► Phase 6 (US4: Voice messages) ◄── requires messaging module; adds VoiceRecording + upload endpoint
    │
    └──► Phase 7 (US5: Calls) ◄── requires auth + conversation context; independent of voice messages

Phase 8 (Polish) ◄── can begin after Phase 4; most tasks are independent of each other
```

---

## Parallel Execution Examples

**US1 (after T022 completes):**

- T023–T031 (backend: auth + user DTOs, services, controllers) in parallel with T032–T037 (frontend: AuthContext, Login/Register pages, router)

**US2 (after T031 completes):**

- T040–T045 (backend: conversations + messages service + gateway) in parallel with T046–T052 (frontend: services, ConversationList, ChatView, MessageInput)

**US3 (after T044 `chat:board:move` is available):**

- T057–T060 (all frontend board tasks) can run fully in parallel

**US4 (after T043 messages.module is ready):**

- T061–T063 (backend voice upload) in parallel with T064–T066 (frontend recorder + player)

**US5 (after T044 and T017 are complete):**

- T068–T070 (backend calls service + gateway) in parallel with T071–T075 (frontend call hooks + UI)

**Polish (after Phase 4):**

- T078–T087 are fully independent of each other

---

## Implementation Strategy

**MVP scope**: Phases 1–3 (Setup + Foundation + US1 Auth) constitute a shippable identity layer.

**Increment 1** (recommended first milestone): Phases 1–4 — authenticated real-time text messaging.  
**Increment 2**: Phase 5 (board views).  
**Increment 3**: Phase 6 (voice messages).  
**Increment 4**: Phase 7 (audio/video calls).  
**Increment 5**: Phase 8 (polish).

---

## Format Validation

All tasks follow the required checklist format:

- ✅ Every task begins with `- [ ]`
- ✅ Every task has a sequential ID (T001–T087)
- ✅ `[P]` marker present on all parallelisable tasks
- ✅ `[US1]`–`[US5]` labels on all user-story phase tasks; absent on setup/foundation/polish tasks
- ✅ Every task includes an explicit file path
