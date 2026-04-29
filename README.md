# ChatApp — Backend

The backend for the real-time chat application. Built with **Express**, **tRPC v10**, **Socket.io**, **Prisma** (PostgreSQL), and **Redis** for online-presence tracking.

---

## Features

- **Type-safe API** — tRPC routes with Zod validation; no REST boilerplate
- **Real-time delivery** — Socket.io server relays messages/edits/deletes to the recipient instantly
- **Online presence** — Redis sorted set tracks active users with a 1-hour expiry; extended on each request
- **Soft deletes** — Messages can be deleted for self (`SELF`) or for all parties (`ALL`)
- **JWT auth** — HTTP-only cookie; 12-hour expiry; bcrypt password hashing (salt rounds: 12)
- **Browser timestamps** — Accepts an optional `sentAt` from the client so the stored time reflects the sender's clock

---

## Tech Stack

| Layer | Technology |
|---|---|
| HTTP server | Express 4 |
| API layer | tRPC v10 |
| Real-time | Socket.io v4 |
| ORM | Prisma 5 (PostgreSQL) |
| Cache / presence | Redis (ioredis) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | Zod |
| Runtime | Node.js with tsx (TypeScript) |

---

## Prerequisites

- **Node.js 18+**
- **PostgreSQL** database
- **Redis** instance (local or remote)

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (see below)
cp .env.example .env

# 3. Apply database migrations
npx prisma migrate deploy

# 4. Generate Prisma client
npx prisma generate

# 5. Start the dev server (hot-reload)
npm run dev
```

| Port | Service |
|---|---|
| **8080** | tRPC HTTP API |
| **8081** | Socket.io server |

---

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
REDIS_URL="redis://localhost:6379"
```

> `DATABASE_URL` is used by Prisma at runtime; `DIRECT_URL` is the direct connection (needed for some hosted PostgreSQL providers).

---

## Project Structure

```
tRPC-server/
├── index.ts            Express app entry — mounts tRPC, Socket.io, WebSocket
├── trpc.ts             tRPC initialisation (base procedure)
├── context.ts          Request context (user from JWT cookie)
├── schema.prisma       Prisma schema (User, IndividualChat, IndividualMessage)
├── redis.ts            Online-user helpers (add/remove/check/get)
├── socket.ts           Socket.io server setup + connection lifecycle
├── routes/
│   ├── AppRoutes.ts    Root router (merges userRouter + messageRouter)
│   ├── userRoutes.ts   register, login, logout, verify, online-presence
│   ├── messageRoutes.ts sendIndividualMessage, loadIndividualChat, getAllChats,
│   │                    deleteMessage, editMessage, createChat
│   └── middlewares.ts  isAuthenticatedUser (JWT guard procedure)
└── constants/
    ├── messageSchema.ts Zod input/output schemas
    └── events.ts        Socket event type constants
```

---

## Database Schema

```
User
  id, email (unique), username (unique), password (bcrypt), createdAt, updatedAt

IndividualChat
  id (cuid), Users (many-to-many), createdAt, updatedAt

IndividualMessage
  id (cuid), message, sentAt, receivedAt?, editedAt?
  chatId, senderId, recipientId
  deletedBy?, deletedAt?, deletionScope? (SELF | ALL)
  viewed
```

---

## API Routes

All routes are accessed via `POST /trpc/<router>.<procedure>` (tRPC batch protocol).

### `user` router

| Procedure | Type | Description |
|---|---|---|
| `register` | mutation | Create account; sets JWT cookie |
| `login` | mutation | Authenticate; sets JWT cookie |
| `logout` | mutation | Clears JWT cookie, marks user offline |
| `verify` | query | Verifies JWT from cookie |
| `getOnlineUsers` | query | Returns list of currently online users |
| `setUserOnline` | query | Marks calling user as online in Redis |
| `setUserOffline` | query | Marks calling user as offline in Redis |

### `message` router

| Procedure | Type | Description |
|---|---|---|
| `sendIndividualMessage` | mutation | Persist message; relay via Socket.io if recipient is online |
| `loadIndividualChat` | mutation | Load messages for a chat, grouped by date |
| `getAllChats` | query | Fetch all chats for the logged-in user; marks pending messages as received |
| `createChat` | mutation | Create (or return existing) chat between two users |
| `deleteMessage` | mutation | Soft-delete for self or hard-delete for all |
| `editMessage` | mutation | Update message text; notify recipient via Socket.io |

---

## Online Presence

Users are tracked in a Redis **sorted set** (`users:online`) keyed by user ID with a score of `now + 3600000ms`. A separate **hash** (`users:socketid`) maps user IDs to their current Socket.io socket ID.

- On login: `addUser(userId)` — sets expiry score
- On each tRPC request: `checkAndResetUser(userId)` — extends expiry by 1 hour
- On Socket.io disconnect: `removeUser()` + `removeSocketId()`
- On server shutdown (SIGTERM/SIGINT): `clearOnlineUsers()` cleans up all Redis keys

---

## Related

- **Frontend**: [`next-test-app`](https://github.com/Balaguru1601/next-test-app) — Next.js 14 + tRPC client + Socket.io client + Zustand
