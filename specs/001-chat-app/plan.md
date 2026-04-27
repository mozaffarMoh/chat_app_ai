# Implementation Plan: Real-Time Chat Application

**Branch**: `001-chat-app` | **Date**: 2026-04-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-chat-app/spec.md`

## Summary

Build a modern real-time chat web application where authenticated users can exchange text
messages, send voice messages, and conduct 1-on-1 audio/video calls. The workspace offers
two views: a chronological conversation list and a Kanban-style board for productivity-oriented
conversation management. The backend is a NestJS REST + WebSocket API backed by PostgreSQL
(Prisma ORM) with JWT authentication; the frontend is a React SPA using Ant Design components.
Peer-to-peer calls are established via simple-peer (WebRTC) with a NestJS signalling gateway.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) — both backend and frontend  
**Primary Dependencies**:

- **Backend**: NestJS, Prisma ORM, socket.io, jsonwebtoken, simple-peer (signalling)
- **Frontend**: React 18, Ant Design 5, axios, socket.io-client, simple-peer
  **Storage**: PostgreSQL (primary data store via Prisma), filesystem/object storage for voice recordings  
  **Testing**: Jest + Supertest (backend); React Testing Library + Jest (frontend)  
  **Target Platform**: Desktop and mobile web browsers (Chrome, Firefox, Safari, Edge)  
  **Project Type**: Full-stack web application (NestJS API + React SPA)  
  **Performance Goals**: Messages delivered < 1 s; call connection < 5 s after accept; view switch < 500 ms  
  **Constraints**: HTTPS/WSS transport; no offline-first; 1-on-1 calls only; 100-conversation board render without lag  
  **Scale/Scope**: ~100 concurrent conversations per user; full feature set across ~10 screens

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle           | Gate                                                                                       | Status                                                         |
| ------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| I. Code Quality     | TypeScript strict mode on both backend and frontend; no `any`                              | ✅ PASS — stack is TS throughout                               |
| II. Architecture    | Modular NestJS modules; React feature-based folders; business logic in services            | ✅ PASS — NestJS modules enforce this naturally                |
| III. UI & Frontend  | Ant Design theming; RTL support via `dir` attribute + Ant Design RTL; responsive layout    | ✅ PASS — Ant Design 5 has first-class RTL support             |
| IV. Testing         | Jest on both sides; TDD for auth, messaging, call signalling; RTL for UI                   | ✅ PASS — stack supports TDD                                   |
| V. Performance      | React.lazy + code splitting; no heavy main-thread work; socket events off render cycle     | ✅ PASS — no violations anticipated                            |
| VI. Error Handling  | NestJS global exception filter; centralized axios error interceptor on frontend            | ✅ PASS — NestJS exception architecture enforces this          |
| VII. Security       | JWT in httpOnly cookies or Authorization header; Prisma parameterised queries; env secrets | ✅ PASS — no hardcoded secrets; JWT + Prisma prevent injection |
| VIII. Documentation | JSDoc on public services, controllers, and React components                                | ✅ PASS — to be enforced in tasks                              |
| IX. Dev Workflow    | ESLint + Prettier; Conventional Commits; PR review gate                                    | ✅ PASS — to be configured in setup tasks                      |
| X. AI & Automation  | Generated code reviewed before commit                                                      | ✅ PASS — governance process                                   |

**Constitution Check result**: ALL GATES PASS ✅ — proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-chat-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── rest-api.md
│   └── websocket-events.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/            # Registration, login, JWT strategy, guards
│   ├── users/           # User profile, avatar, presence
│   ├── conversations/   # Direct & group conversation CRUD
│   ├── messages/        # Text message CRUD + WS gateway
│   ├── voice/           # Voice recording upload + storage
│   ├── calls/           # Call session lifecycle + WS signalling gateway
│   ├── board/           # Kanban column assignment + drag persistence
│   ├── prisma/          # PrismaService, schema, migrations
│   └── common/          # Guards, interceptors, filters, DTOs
├── test/
│   ├── e2e/
│   └── unit/
├── prisma/
│   └── schema.prisma
└── package.json

frontend/
├── src/
│   ├── app/             # Root App component, router, providers
│   ├── features/
│   │   ├── auth/        # Login, register pages + auth context
│   │   ├── conversations/ # Conversation list view
│   │   ├── board/       # Kanban board view
│   │   ├── chat/        # Message thread, voice recorder, message bubble
│   │   ├── calls/       # Audio/video call UI, simple-peer integration
│   │   └── profile/     # User profile settings
│   ├── shared/
│   │   ├── hooks/       # useSocket, useAuth, usePresence, useCall
│   │   ├── services/    # axios instance, API service functions
│   │   ├── components/  # Reusable UI: Avatar, Badge, EmptyState, etc.
│   │   └── types/       # Shared TypeScript interfaces
│   └── styles/          # Global theme tokens, Ant Design config
├── public/
└── package.json
```

**Structure Decision**: Web application (Option 2) — separate `backend/` and `frontend/` at the
repository root. NestJS is a natural module boundary enforcer; React feature-based folders keep
each user story (auth, messaging, board, calls) independently navigable and testable.

## Complexity Tracking

> No constitution violations. No complexity justification required.
