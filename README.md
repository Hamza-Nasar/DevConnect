# ⚡ DevConnect

> **A modern, real-time social platform for developers — built for scale, speed, and reliability.**

DevConnect blends **real-time messaging**, **live social feeds**, and **AI-powered features** into a production-grade system designed to handle high traffic, persistent connections, and enterprise-level performance — without compromising developer experience.

---

## ✨ What Makes DevConnect Different?

🚀 **Real-time by design** — not an afterthought
🧠 **AI-assisted interactions** for smarter workflows
🌍 **Globally scalable architecture**
🔌 **Fault-tolerant & reconnect-safe messaging**
⚙️ **Clean separation of stateless + stateful systems**

---

## 🧭 High-Level Overview

DevConnect is a **full‑stack developer social network** architected around a hybrid deployment model:

* **Stateless frontend** optimized for speed and global delivery
* **Stateful real-time backend** optimized for persistent connections

This separation ensures **low latency UI** while maintaining **reliable WebSocket communication** at scale.

**Production Deployment**

* 🌐 Frontend: **Vercel (Next.js Serverless + Edge CDN)**
* 🔗 Backend: **Railway (Node.js + Socket.io persistent server)**

---

## 🏗️ System Architecture (Why It Works)

### 🎨 Frontend — Vercel

* Next.js 15 (App Router)
* Serverless API routes
* Edge‑cached static assets
* Automatic global scaling

### 🔌 Backend — Railway

* Node.js + Express
* Dedicated Socket.io server
* Long‑lived processes for connection state
* Real-time event routing

### 🧠 Why This Separation Exists

✔ Serverless platforms **cannot maintain persistent WebSocket connections**
✔ Real‑time systems require **connection memory & room state**
✔ Independent scaling for UI traffic vs socket traffic
✔ Best of both worlds: **Edge speed + Stateful reliability**

---

## 🧩 State Management Philosophy

* 🧠 **Zustand** — global client state (sessions, online users, UI prefs)
* ⚛️ **React Hooks** — local UI logic
* 🔗 **Socket Singleton** — one connection, predictable lifecycle

> Simple, fast, and scalable without Redux overhead.

---

## 🔥 Real-Time Engine

Event‑driven, room‑scoped, and performance‑optimized.

### Core Events

* `MESSAGE_CREATED`
* `USER_ONLINE / USER_OFFLINE`
* `POST_ENGAGED`
* `TYPING`
* `MESSAGE_READ`
* `NOTIFICATION`

Events are scoped to **user rooms**, **conversation rooms**, and **post rooms** — minimizing noise and bandwidth usage.

---

## 💬 Messaging v2 — Built for Reality

A production-grade chat system that survives:

* Network drops
* Tab closures
* Device switches
* Refresh storms

### 📦 Offline Message Queue

Messages are **persisted immediately** to MongoDB.

When a user reconnects:

1. Client emits `join`
2. Server fetches unread messages
3. Messages are replayed via socket
4. Client deduplicates using message IDs

✅ No message loss. No duplicates.

---

### 🔄 Smart Reconnection Sync

* Message ID deduplication
* Optimistic UI updates
* Server‑acknowledged IDs replace temp IDs
* API + socket state reconciliation

Result: **Instant UI with eventual consistency**.

---

### ✅ Delivery States

| State         | Meaning                        |
| ------------- | ------------------------------ |
| **Sent**      | Stored in DB successfully      |
| **Delivered** | Reached recipient socket       |
| **Read**      | User explicitly viewed message |

Visual flow: ✔ → ✔✔

---

### ♻️ Auto‑Recovery System

* Exponential HTTP retries
* Socket auto‑reconnect (1s → 5s)
* Heartbeat ping/pong (30s)
* Browser Visibility API re‑sync

Built to **heal itself**.

---

### ✍️ Typing Indicators (No Ghost States)

* Debounced typing events
* Auto‑clear after 3s inactivity
* Immediate clear on input empty

No more stuck *“typing…”* bugs.

---

## 🟢 Presence & Last‑Seen Accuracy

* Multi‑tab aware socket tracking
* User marked offline only when **all sockets disconnect**
* `lastSeen` persisted to MongoDB
* Real‑time broadcast to peers

Reliable presence — even across tabs.

---

## ⚡ Performance First

### 📊 Socket Throughput Monitoring

* Event‑level logging (dev)
* Production‑ready metrics hooks
* Compatible with DataDog / New Relic

### 🧵 Debounced Feed Updates

* Instant local updates
* Duplicate prevention
* Targeted state mutation
* Zero full‑feed re‑fetches

### 🔔 Batched Notifications

* Multiple notifications → single event
* Reduced socket chatter
* 30s polling fallback

---

## ⚖️ Trade‑offs (Honest Engineering)

### Current Constraints

* Single backend instance (Redis adapter planned)
* Last 100 messages per conversation
* Base64 media upload limits
* No end‑to‑end encryption yet

### Conscious Design Decisions

* Optimistic UI over blocking UX
* Real‑time first, polling as safety net
* Zustand simplicity over Redux complexity

---

## 🧪 Technology Stack

| Layer    | Tech                 |
| -------- | -------------------- |
| Frontend | Next.js 15, React 19 |
| Styling  | Tailwind CSS 4       |
| State    | Zustand              |
| Realtime | Socket.io 4.8        |
| Backend  | Node.js, Express     |
| Database | MongoDB              |
| Auth     | NextAuth.js          |
| AI       | Gemini 1.5, OpenAI   |
| Media    | Cloudinary           |
| Hosting  | Vercel + Railway     |

---

## 🚀 Getting Started

```bash
git clone <repo>
cd devconnect
npm install
npm run dev
```

Configure `.env.local` with MongoDB, Auth, AI, and Cloudinary keys.

---

## 📜 License

🔒 **Proprietary Software**
Viewing for portfolio or evaluation only.

❌ No copying, redistribution, or commercial use.

---

📩 **Contact**: [hamzanasar144@gmail.com](mailto:hamzanasar144@gmail.com)
🌐 **Portfolio**: [https://hamza-dev-blond.vercel.app/](https://hamza-dev-blond.vercel.app/)

---

> **DevConnect isn’t just a social app — it’s a real‑time system engineered with intent.**
