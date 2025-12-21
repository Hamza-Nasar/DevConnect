# 🚀 DevConnect - The Ultimate Developer Social Platform

DevConnect is a premium, enterprise-grade social networking platform designed specifically for developers. Built with a modern tech stack including **Next.js 16**, **MongoDB**, and **Socket.io**, it offers a seamless real-time experience with advanced social features.

### Developed by **Hamza Nasar** 👨‍💻

---

## ✨ Features Breakdown

### 🎯 Core Social Features
- **Real-Time Feed**: Smart-ranked feed with live updates, media support, and interactive polls.
- **Advanced Messaging**: Real-time direct messaging with typing indicators, read receipts, and message requests.
- **Stories & Reels**: Immersive, ephemeral content sharing for quick updates and short-form videos.
- **Groups & Communities**: Create niche developer communities, manage members, and organize discussions.
- **Events & RSVP**: Create developer meetups, workshops, or webinars with an integrated RSVP system.
- **WebRTC Live Streaming**: High-performance live streaming for coding sessions or tech talks.

### 🤖 AI-Enhanced Experience
- **AI Bio Architect**: Automatically enhance and professionalize your user bio.
- **Smart Hashtagging**: AI-suggested tags based on post content for maximum reach.
- **Code Explainer**: Built-in AI to explain complex code snippets shared in the feed.
- **Content Summarization**: Quick summaries for long-form dev blogs and posts.

### 🏆 Reputation & Engagement
- **Developer Reputation System**: Earn points and levels based on community contributions.
- **Global Leaderboard**: Compete with other developers and showcase your expertise.
- **Advanced Reactions**: Move beyond simple likes with "Insightful", "Helpful", and "Love" reactions.
- **Analytics Dashboard**: Detailed insights into post-performance, reach, and engagement metrics.

### 🛠️ Developer Tools
- **Code Snippet Hub**: Dedicated space to share, search, and save reusable code components.
- **Knowledge Base**: Curated developer documentation and community-driven guides.
- **Markdown Support**: Rich text editing with full Markdown and syntax highlighting.

### 🔐 Security & Privacy
- **Enterprise-Grade Auth**: Secure authentication via Google OAuth and NextAuth.js.
- **MFA & Recovery**: Multi-factor authentication support and secure password recovery.
- **Privacy Suite**: Granular controls over profile visibility, message requests, and activity status.
- **Content Moderation**: Robust reporting and automated moderation tools for a safe community.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router & Turbopack) |
| **Styling** | Vanilla CSS + Tailwind CSS 4 |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Database** | [MongoDB](https://www.mongodb.com/) (NoSQL) |
| **Real-time** | [Socket.io](https://socket.io/) (WebSockets) |
| **Authentication** | [NextAuth.js](https://next-auth.js.org/) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Media** | [Cloudinary](https://cloudinary.com/) |

---

## 📦 Deployment Architecture

DevConnect is designed for a hybrid deployment model for maximum reliability:

1. **Frontend & REST API**: Hosted on **Vercel** for lightning-fast edge delivery.
2. **Persistent Socket Server**: Hosted on **Railway** to manage long-running WebSocket connections.

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- MongoDB Instance (Atlas or Local)
- GitHub Account

### Quick Start
1. **Clone the project**
   ```bash
   git clone https://github.com/Hamza-Nasar/2.git
   cd devconnect
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` and add your keys:
   ```env
   MONGODB_URI=your_uri
   NEXTAUTH_SECRET=your_secret
   NEXT_PUBLIC_SOCKET_URL=your_railway_url
   OPENAI_API_KEY=your_key
   ```

4. **Launch Development Environment**
   ```bash
   npm run dev
   ```

---

## 👨‍💻 Developer
**Hamza Nasar**
- GitHub: [Hamza-Nasar](https://github.com/Hamza-Nasar)

---

© 2025 DevConnect. Created by Hamza Nasar. Built with ❤️ for the global developer community.
