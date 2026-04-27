# Quickstart Guide: Real-Time Chat Application

**Feature**: 001-chat-app | **Phase**: 1 | **Date**: 2026-04-26

---

## Prerequisites

| Tool       | Version  | Notes                        |
| ---------- | -------- | ---------------------------- |
| Node.js    | ≥ 20 LTS | Use `nvm` to manage versions |
| npm        | ≥ 10     | Comes with Node 20           |
| PostgreSQL | ≥ 15     | Local install or Docker      |
| Git        | any      |                              |

---

## 1. Clone & Install

```bash
git clone <repo-url> chat-app
cd chat-app

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

---

## 2. Configure Environment

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatapp_dev"

# JWT
JWT_ACCESS_SECRET="replace-with-64-char-random-secret"
JWT_REFRESH_SECRET="replace-with-64-char-random-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# App
PORT=3001
CORS_ORIGIN="http://localhost:5173"

# File uploads
UPLOAD_DIR="./uploads"
MAX_VOICE_SIZE_BYTES=4194304
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL="http://localhost:3001/api/v1"
VITE_SOCKET_URL="http://localhost:3001"
```

---

## 3. Set Up the Database

```bash
cd backend

# Run Prisma migrations (creates tables)
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

---

## 4. Start Development Servers

Open two terminal windows:

**Terminal 1 — Backend**

```bash
cd backend
npm run start:dev
# NestJS hot-reload server starts on http://localhost:3001
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
# Vite dev server starts on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Verify the Setup

1. Register two user accounts (User A and User B) in two different browser tabs or incognito windows.
2. From User A's workspace, search for User B and start a direct conversation.
3. Send a text message — it should appear for both users within 1 second.
4. Switch to the Board view and drag the conversation to a different column.
5. Initiate an audio or video call from User A to User B.

---

## 6. Run Tests

```bash
# Backend unit + e2e tests
cd backend
npm test           # unit tests
npm run test:e2e   # e2e tests (requires running DB)

# Frontend tests
cd frontend
npm test
```

---

## 7. Lint & Format

```bash
# Backend
cd backend && npm run lint && npm run format

# Frontend
cd frontend && npm run lint && npm run format
```

Both projects use ESLint + Prettier. All checks must pass before committing (enforced by Constitution Principle IX).

---

## 8. Project Layout Reference

```
/
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT auth module
│   │   ├── users/          # User profile, presence
│   │   ├── conversations/  # Conversation CRUD
│   │   ├── messages/       # Text + voice messages, /chat gateway
│   │   ├── voice/          # Voice upload endpoint
│   │   ├── calls/          # Call sessions, /calls gateway
│   │   ├── board/          # Kanban column management
│   │   ├── prisma/         # PrismaService
│   │   └── common/         # Guards, filters, interceptors
│   ├── prisma/
│   │   └── schema.prisma
│   └── test/
├── frontend/
│   ├── src/
│   │   ├── app/            # Router, providers
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── conversations/
│   │   │   ├── board/
│   │   │   ├── chat/
│   │   │   ├── calls/
│   │   │   └── profile/
│   │   ├── shared/
│   │   │   ├── hooks/      # useSocket, useAuth, useCall, usePresence
│   │   │   ├── services/   # axios instance, API functions
│   │   │   ├── components/ # Shared UI components
│   │   │   └── types/
│   │   └── styles/
│   └── public/
├── specs/
│   └── 001-chat-app/       # This spec
└── push.sh
```

---

## 9. Key Commands Reference

| Command                  | Location    | Purpose                                       |
| ------------------------ | ----------- | --------------------------------------------- |
| `npm run start:dev`      | `backend/`  | NestJS hot-reload                             |
| `npm run dev`            | `frontend/` | Vite dev server                               |
| `npx prisma migrate dev` | `backend/`  | Run new migrations                            |
| `npx prisma generate`    | `backend/`  | Regenerate Prisma client after schema changes |
| `npm test`               | either      | Run Jest test suite                           |
| `npm run lint`           | either      | ESLint check                                  |
| `npm run format`         | either      | Prettier format                               |
| `npm run build`          | either      | Production build                              |
