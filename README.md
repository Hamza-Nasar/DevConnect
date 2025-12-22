# DevConnect

A production-grade, real-time developer social platform built for enterprise-scale reliability and performance. DevConnect combines real-time messaging, live feed updates, and AI-powered features with a fault-tolerant architecture designed for high availability.

## Overview

DevConnect is a full-stack social networking platform specifically designed for developers. The system implements a hybrid architecture that separates real-time WebSocket services from serverless frontend functions, enabling optimal performance and scalability for both stateless HTTP requests and persistent connection management.

The platform is currently deployed in production with the frontend hosted on Vercel (Next.js serverless functions) and the real-time backend on Railway (Node.js with persistent Socket.io connections).

## Technical Architecture

### Deployment Architecture

**Frontend (Vercel)**
- Next.js 15 with App Router
- Serverless functions for API routes
- Edge-optimized static assets
- Automatic scaling and global CDN distribution

**Backend (Railway)**
- Node.js runtime with Express
- Socket.io server for persistent WebSocket connections
- Long-lived process for real-time event handling

**Rationale for Separation**

The frontend and backend are intentionally separated because:

1. **WebSocket Limitations**: Vercel's serverless functions have execution time limits and cannot maintain persistent WebSocket connections. Socket.io requires a long-running process to manage connection state, message queues, and room memberships.

2. **Connection Management**: Real-time features require maintaining socket connections across multiple tabs/devices per user. This stateful management is incompatible with stateless serverless functions.

3. **Resource Optimization**: Separating concerns allows the frontend to leverage Vercel's edge network for fast static delivery while the backend handles connection-intensive operations on a dedicated server.

4. **Scalability**: The backend can be horizontally scaled independently using Socket.io's Redis adapter (when needed), while the frontend benefits from Vercel's automatic edge scaling.

### State Management

- **Zustand**: Global client-side state for user sessions, online status, and UI preferences
- **React Hooks**: Component-level state with `useState` and `useEffect` for local UI state
- **Socket.io Client**: Centralized socket instance managed via singleton pattern (`lib/socket.ts`)

### Real-Time Communication

The system uses an event-driven socket architecture with the following event types:

- `MESSAGE_CREATED`: New message broadcast to recipient
- `USER_ONLINE` / `USER_OFFLINE`: Presence status updates
- `POST_ENGAGED`: Real-time likes, comments, and shares
- `TYPING`: Typing indicator events
- `MESSAGE_READ`: Read receipt acknowledgments
- `NOTIFICATION`: Batched notification delivery

## Messaging v2: Production-Grade Real-Time System

### Offline Message Queue

Messages are persisted to MongoDB immediately upon creation, regardless of recipient online status. When a user reconnects:

1. Client emits `join` event with user ID
2. Server queries unread messages for the user
3. Messages are delivered via `new_message` socket events
4. Client deduplicates using message IDs to prevent duplicates

This ensures message delivery even during network interruptions or browser tab closures.

### Reconnection Synchronization

The system prevents message duplication during reconnection through:

- **Message ID Deduplication**: Client maintains a Set of received message IDs and filters duplicates before adding to state
- **Optimistic Updates**: Temporary message IDs are replaced with server-generated IDs upon acknowledgment
- **State Reconciliation**: On reconnect, the client fetches the latest message state from the API and merges with socket-delivered messages

### Message Delivery Guarantees

The platform implements three distinct delivery states:

1. **Sent**: Server acknowledgment after message persistence to database
   - Confirmed via HTTP 200 response from `/api/messages` POST endpoint
   - Message stored in MongoDB with `read: false`

2. **Delivered**: Recipient socket receipt confirmation
   - Socket event `new_message` received by recipient client
   - UI updates immediately upon receipt

3. **Read**: Explicit read receipt via user interaction
   - Triggered when user opens conversation or scrolls to message
   - POST to `/api/messages/[userId]/read` marks messages as read
   - Socket event `message_read` notifies sender
   - Visual indicator updates (single check → double check)

### Automatic Retry on Transient Failures

- **Client-Side Retry**: Failed HTTP requests are retried with exponential backoff
- **Socket Reconnection**: Socket.io client automatically reconnects with configurable delays (1s initial, max 5s)
- **Heartbeat Mechanism**: 30-second ping/pong to detect stale connections
- **Visibility API**: Reconnection triggered when browser tab becomes visible

### Typing Indicator Timeout Handling

Typing indicators automatically clear after 3 seconds of inactivity to prevent stuck states:

- Client debounces typing events with a 3-second timeout
- If input becomes empty, typing indicator is immediately cleared
- Server-side timeout (if implemented) provides additional safety net
- Prevents UI from showing "typing..." indefinitely

### Last-Seen Logic

Last-seen timestamps are calculated using socket lifecycle events:

- **Online**: Set when user emits `join` event and socket connects
- **Offline**: Set when all sockets for a user disconnect (handles multiple tabs)
- **Accurate Tracking**: Uses `userSockets` Map to track multiple connections per user
- **Database Persistence**: `lastSeen` field updated in MongoDB on disconnect
- **Real-Time Broadcast**: `user_status` events broadcast to all relevant clients

## Performance Considerations

### Socket Events Per Second Monitoring

The system measures socket throughput for performance monitoring:

- Development mode logs all socket events (excluding heartbeat pings)
- Production-ready for integration with monitoring tools (DataDog, New Relic, etc.)
- Event names and payload sizes can be tracked for capacity planning

### Debounced Real-Time Feed Updates

Feed updates are debounced to prevent UI thrashing:

- New posts are added to state immediately for instant feedback
- Duplicate detection prevents re-rendering of existing posts
- Socket events trigger targeted state updates rather than full feed refetches
- Client-side filtering (Trending, Latest, Photos, Videos) operates on in-memory state

### Batched Notifications System

Notifications are batched to reduce network overhead:

- Multiple notifications can be delivered in a single socket event
- Client aggregates notifications and displays them in a unified UI
- Reduces socket event volume during high-activity periods
- 30-second polling fallback ensures delivery even if socket events are missed

### Event-Driven Socket Architecture

The system uses a room-based architecture for efficient message routing:

- Users join `user:{userId}` rooms upon connection
- Posts join `post:{postId}` rooms for real-time engagement updates
- Conversations use `conversation:{conversationId}` rooms
- Broadcasts are scoped to relevant rooms, reducing unnecessary network traffic

## Trade-offs & Limitations

### Current Limitations

1. **Single Backend Instance**: The current deployment uses a single Railway instance. Horizontal scaling would require Redis adapter for Socket.io to share connection state across instances.

2. **Message History**: Message history is limited to the last 100 messages per conversation. Full history requires pagination implementation.

3. **File Upload Size**: Media uploads are limited by base64 encoding in memory. Large files should use direct-to-storage uploads (S3, Cloudinary) with signed URLs.

4. **No Message Encryption**: Messages are stored in plaintext in MongoDB. End-to-end encryption would require client-side encryption before transmission.

5. **Presence Accuracy**: Last-seen accuracy depends on socket disconnection events. Network interruptions may cause delayed offline status updates.

### Design Trade-offs

1. **Optimistic Updates vs. Consistency**: The system prioritizes instant UI feedback with optimistic updates, accepting that occasional rollbacks may be necessary on failure.

2. **Real-Time vs. Polling**: Real-time updates are preferred, but polling fallbacks exist for critical features (notifications) to ensure reliability.

3. **State Management Complexity**: Zustand provides simplicity but may require refactoring for very large state trees. Consider Redux Toolkit for complex state logic.

4. **Database Normalization**: User IDs are stored in multiple formats (MongoDB `_id`, OAuth `id`) to support flexible authentication. This requires careful ID resolution in queries.

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend Framework** | Next.js 15 (App Router), React 19 |
| **Styling** | Tailwind CSS 4.0, CSS Modules |
| **State Management** | Zustand 5.0 |
| **Real-Time** | Socket.io 4.8 (Client & Server) |
| **Backend Runtime** | Node.js, Express 5.1 |
| **Database** | MongoDB 5.9 (Native Driver) |
| **Authentication** | NextAuth.js 4.24 (Google OAuth, Credentials, JWT) |
| **AI Services** | Google Gemini Flash 1.5, OpenAI GPT-4 |
| **Media Storage** | Cloudinary |
| **Deployment** | Vercel (Frontend), Railway (Backend) |

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- MongoDB instance (Atlas or local)
- API Keys:
  - Google AI (Gemini)
  - Cloudinary
  - NextAuth Secret

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd devconnect
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (`.env.local`):
```env
MONGODB_URI="your_mongodb_connection_string"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_AI_API_KEY="your_gemini_api_key"
CLOUDINARY_URL="your_cloudinary_url"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

4. Run development server:
```bash
npm run dev
```

This starts both the Next.js frontend and the Socket.io backend server.

### Production Deployment

**Frontend (Vercel)**
1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

**Backend (Railway)**
1. Create new Railway project
2. Connect repository
3. Set `NEXT_PUBLIC_SOCKET_URL` to Railway app URL
4. Configure environment variables
5. Deploy

**Important**: Update `NEXT_PUBLIC_SOCKET_URL` in Vercel to point to your Railway backend URL after deployment.

## Development

### Project Structure

```
devconnect/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/            # Authentication pages
│   ├── (main)/            # Main application pages
│   └── api/               # API route handlers
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature-specific components
├── lib/                   # Utility libraries
│   ├── socket.ts         # Socket.io client singleton
│   ├── onlineStatusStore.ts  # Online status state management
│   └── ...               # Other utilities
├── server/               # Backend server code
│   └── index.ts         # Socket.io server initialization
└── types/               # TypeScript type definitions
```

### Key Files

- `server/index.ts`: Socket.io server setup and event handlers
- `lib/socket.ts`: Client-side socket singleton and reconnection logic
- `app/(main)/chat/page.tsx`: Real-time messaging UI implementation
- `app/api/messages/route.ts`: Message CRUD API endpoints

## License
This project is proprietary and fully protected by copyright law. 
Unauthorized use, copying, modification, deployment, or distribution is strictly prohibited. 
It may be viewed for portfolio or evaluation purposes only.

Contact: hamzanasar144@gmail.com | Portfolio: [https://hamza-dev-blond.vercel.app/](https://hamza-dev-blond.vercel.app/)
