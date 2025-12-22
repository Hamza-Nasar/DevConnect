# DevConnect 🚀

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)

**DevConnect** is a premium, enterprise-grade social networking ecosystem meticulously crafted for the modern developer. Built with a "Real-Time First" philosophy, it combines cutting-edge web technologies with a sleek, developer-centric aesthetic.

> [!NOTE]
> This platform is not just a social network; it's a productivity-focused hub where developers connect, collaborate, and grow.

---

## ✨ Premium Features

### 📡 Real-Time Ecosystem
- **Instant Messaging**: High-performance chat with typing indicators, read receipts, and file sharing.
- **RTC Voice & Video**: Seamless peer-to-peer calling integrated directly into the chat interface.
- **Live Notifications**: Never miss an interaction with zero-latency global notifications.
- **Live Streaming**: Stream your coding sessions directly to your followers.

### 🧠 AI-Powered Intelligence
- **AI Bio Architect**: professionalize your identity with AI-crafted resumes and bios.
- **Code Explainer**: Share code snippets and let AI provide instant context and explanations.
- **Smart Feed**: Content ranking algorithm that surfaces the most relevant tech discussions for you.
- **Auto-Hashtagging**: Intelligent categorization of posts for maximum discoverability.

### 🎮 Gamification & Engagement
- **Developer Reputation**: Earn 'DevCred' through contributions, helpful answers, and engagement.
- **Leaderboards**: Showcase your expertise and climb the global developer rankings.
- **Rich Reactions**: Go beyond 'Likes' with insightful, helpful, and creative reactions.
- **Interactive Polls**: Engage your audience with real-time feedback and opinion polls.

### 🛠️ Developer-First Toolkit
- **Snippet Hub**: A dedicated library for sharing and versioning reusable code snippets.
- **Markdown Mastery**: Full support for GFM (GitHub Flavored Markdown) in posts and comments.
- **Analytics Suite**: Detailed insights into your post-performance and audience reach.
- **Theme Engine**: Deeply integrated dark mode and premium glassmorphic UI components.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, Framer Motion |
| **Styling** | Vanilla CSS, Tailwind CSS 4.0 |
| **Backend** | Node.js, Express, Socket.io |
| **Database** | MongoDB (Native Driver), Prisma |
| **Auth** | NextAuth.js (Google OAuth, JWT) |
| **Real-time** | Socket.io, WebRTC (SimplePeer) |
| **Communications** | Twilio (SMS/OTP) |
| **Storage** | Cloudinary |
| **AI** | OpenAI GPT-4, Google Gemini Pro |

---

## 📂 Project Structure

```text
devconnect/
├── app/                  # Next.js App Router (Pages & API)
│   ├── (auth)/           # Authentication flows
│   ├── (main)/           # Core application pages
│   └── api/              # Serverless API endpoints
├── components/           # Reusable UI components
│   ├── ui/               # Primary design system (Radix-based)
│   ├── post/             # Feed & Content components
│   └── chat/             # Messaging & RTC components
├── lib/                  # Shared utilities & configurations
├── prisma/               # Database schema & migrations
├── public/               # Static assets
├── scripts/              # Maintenance & setup scripts
└── server.ts             # Custom Express/Socket.io integration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- MongoDB (Atlas or Local)
- Essential API Keys (Google, Cloudinary, OpenAI)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Hamza-Nasar/2.git
   cd devconnect
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Database & Auth
   MONGODB_URI="your_mongodb_connection_string"
   NEXTAUTH_SECRET="your_secret_key"
   NEXTAUTH_URL="http://localhost:3000"

   # Socket Architecture
   NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

   # AI Integrations
   OPENAI_API_KEY="your_openai_key"
   GOOGLE_AI_API_KEY="your_gemini_key"

   # Media & Communication
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"
   TWILIO_ACCOUNT_SID="your_sid"
   TWILIO_AUTH_TOKEN="your_token"
   ```

4. **Run in Development**
   ```bash
   npm run dev
   ```

---

## 🏗️ Architecture Note

DevConnect utilizes a **hybrid architecture**:
- **Next.js** handles the frontend, routing, and RESTful API endpoints.
- A **Custom Node Server** (`server.ts`) integrates with Next.js to provide persistent **Socket.io** connections for real-time features.
- State is managed via **Zustand** for high-performance client-side reactivity.

---

## 👨‍💻 Developed By

**Hamza Nasar** 
[GitHub](https://github.com/Hamza-Nasar) | [Portfolio](https://hamza-nasar.com)

---

© 2025 DevConnect. Built with passion for the global developer community.
