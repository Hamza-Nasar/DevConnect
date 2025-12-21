# 🚀 DevConnect - Real-Time Social Platform

A modern, enterprise-grade social networking platform built with Next.js, MongoDB, and Socket.io. DevConnect provides real-time communication, advanced social features, and a premium UI/UX experience.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-5.9-green?style=for-the-badge&logo=mongodb)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black?style=for-the-badge&logo=socket.io)

## ✨ Features

### 🎯 Core Features

- **Real-Time Feed** - Live updates with WebSocket integration
- **Advanced Post Creation** - Text, Polls, Stories, Reels with multimedia support
- **Real-Time Messaging** - Direct messages with typing indicators
- **Stories/Reels** - Instagram-style ephemeral content
- **Polls & Surveys** - Interactive polling system
- **Hashtags & Trending** - Discover trending topics and hashtags
- **User Profiles** - Comprehensive user profiles with stats
- **Groups & Communities** - Create and join groups
- **Events** - Event creation and RSVP system
- **Live Streaming** - WebRTC-based live streaming
- **Code Snippets** - Share and discover code snippets
- **Analytics Dashboard** - Post reach and engagement analytics

### 🎨 UI/UX Features

- **Premium Design** - Modern glassmorphism and gradient effects
- **Fully Responsive** - Mobile-first design, works on all devices
- **Dark/Light Theme** - Theme toggle with smooth transitions
- **Smooth Animations** - Framer Motion powered animations
- **Infinite Scroll** - Optimized content loading
- **Drag & Drop** - Intuitive file uploads
- **Micro-interactions** - Enhanced user experience
- **Custom Scrollbars** - Beautiful gradient scrollbars

### 🔐 Security & Privacy

- **NextAuth.js** - Secure authentication with Google OAuth
- **JWT Sessions** - Token-based session management
- **MFA Support** - Multi-factor authentication ready
- **Content Moderation** - Report and flag inappropriate content
- **Privacy Controls** - Granular privacy settings

### ⚡ Performance

- **Optimistic UI** - Instant feedback for better UX
- **Background Sync** - Non-blocking data synchronization
- **Caching** - Redis/Memcached ready for high-speed queries
- **CDN Ready** - Optimized for content delivery
- **Lazy Loading** - Efficient resource loading

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Radix UI** - Unstyled UI components
- **Lucide React** - Icon library
- **React Hot Toast** - Toast notifications

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **MongoDB** - NoSQL database
- **Socket.io** - Real-time bidirectional communication
- **NextAuth.js** - Authentication solution
- **Express** - Custom server for Socket.io

### Additional Libraries
- **WebRTC** - Live streaming capabilities
- **React Player** - Video playback
- **Zod** - Schema validation
- **Zustand** - State management
- **React Hook Form** - Form handling

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd devconnect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL=mongodb://localhost:27017/devconnect
   DATABASE_NAME=devconnect

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-min-32-chars-long

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Socket.io
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

   # Optional: Cloudinary for media uploads
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🚀 Available Scripts

- `npm run dev` - Start development server with Socket.io
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
devconnect/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (main)/          # Main application pages
│   │   ├── feed/        # Feed page with posts
│   │   ├── chat/        # Messaging interface
│   │   ├── explore/     # Explore trending content
│   │   ├── profile/     # User profiles
│   │   └── ...
│   └── api/             # API routes
├── components/
│   ├── ui/              # Reusable UI components
│   ├── layouts/         # Layout components
│   ├── animations/     # Animation components
│   └── ...
├── lib/
│   ├── auth.ts         # NextAuth configuration
│   ├── mongodb.ts      # MongoDB connection
│   ├── socket.ts       # Socket.io client
│   └── ...
├── server.ts           # Custom Express server
└── public/             # Static assets
```

## 🎯 Key Features Explained

### Real-Time Feed
- Live post updates via WebSocket
- Optimistic UI for instant feedback
- Infinite scroll with pagination
- Filter by: All, Following, Trending, Latest, Top, Photos, Videos, Polls

### Post Creation
- **Text Posts** - Rich text with hashtags
- **Polls** - Multiple choice with duration
- **Stories** - 24-hour ephemeral content
- **Reels** - Short-form video content
- **Media Upload** - Images and videos
- **AI Hashtag Suggestions** - Smart hashtag recommendations

### Messaging
- Real-time direct messages
- Typing indicators
- Read receipts
- Group messaging support
- File and image sharing

### Groups & Communities
- Create public/private groups
- Group posts and discussions
- Member management
- Event organization

## 🔧 Configuration

### MongoDB Setup

For local MongoDB:
```env
DATABASE_URL=mongodb://localhost:27017/devconnect
```

For MongoDB Atlas:
```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/devconnect
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env.local`

## 🎨 Customization

### Theme Colors
Edit `app/globals.css` to customize:
- Primary colors (purple/blue gradients)
- Background colors
- Text colors
- Border colors

### Layout Components
- `Container` - Responsive container with max-width
- `GridLayout` - Responsive grid system
- `ResponsiveLayout` - Sidebar layouts

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check `DATABASE_URL` in `.env.local`
- Verify network connectivity

### Socket.io Connection Issues
- Check `NEXT_PUBLIC_SOCKET_URL` in `.env.local`
- Ensure custom server is running (`npm run dev`)
- Check browser console for WebSocket errors

### Authentication Issues
- Verify Google OAuth credentials
- Check `NEXTAUTH_SECRET` is at least 32 characters
- Ensure `NEXTAUTH_URL` matches your domain

## 📝 API Endpoints

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/[id]` - Get single post
- `DELETE /api/posts/[id]` - Delete post

### Messages
- `GET /api/messages` - Get all conversations
- `POST /api/messages` - Send message
- `GET /api/messages/[userId]` - Get conversation with user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/[id]` - Get user profile
- `POST /api/follow` - Follow/unfollow user

### And many more...

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

The app can be deployed to:
- **Vercel** - Best for Next.js
- **Netlify** - Good alternative
- **Railway** - Full-stack deployment
- **AWS** - Enterprise deployment
- **DigitalOcean** - VPS deployment

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 👨‍💻 Author

Built with ❤️ for developers

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- MongoDB for the database
- Socket.io for real-time capabilities
- All open-source contributors

---

**Made with ❤️ using Next.js, MongoDB, and Socket.io**







