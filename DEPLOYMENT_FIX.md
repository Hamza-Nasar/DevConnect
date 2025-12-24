# Realtime Deployment Fix Guide

## Problem
Realtime features (messages, typing, calls, online status) work on localhost but not after Vercel + Railway deployment.

## Root Causes Fixed

1. **CORS Configuration**: Server wasn't explicitly allowing Vercel origins
2. **Socket URL**: Client was trying to connect to Vercel URL instead of Railway URL
3. **Environment Variables**: Missing or incorrect configuration

## Solutions Applied

### 1. CORS Configuration (server/index.ts)
- Added dynamic origin detection
- Allows specific origins in production via `ALLOWED_ORIGINS` env variable
- Falls back to allowing all in development

### 2. Socket Client (lib/socket.ts)
- Better error handling when `NEXT_PUBLIC_SOCKET_URL` is missing
- Improved URL detection and validation
- Better logging for debugging

### 3. Server Configuration (server.ts)
- Added comprehensive logging
- Better error handling
- Environment variable validation

## Deployment Steps

### Railway (Backend)

1. **Set Environment Variables:**
   ```env
   NODE_ENV=production
   PORT=3000
   HOSTNAME=0.0.0.0
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
   NEXT_PUBLIC_SOCKET_URL=https://your-railway-app.railway.app
   MONGODB_URI=your_mongodb_uri
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your_secret
   # ... other env vars
   ```

2. **Railway will automatically:**
   - Detect `package.json`
   - Run `npm install`
   - Run `npm run build` (builds Next.js)
   - Run `npm start` (starts server with Socket.io)

3. **Get your Railway URL:**
   - Railway provides a URL like: `https://your-app.railway.app`
   - Copy this URL for Vercel configuration

### Vercel (Frontend)

1. **Set Environment Variables:**
   ```env
   NEXT_PUBLIC_SOCKET_URL=https://your-railway-app.railway.app
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your_secret
   MONGODB_URI=your_mongodb_uri
   # ... other env vars
   ```

2. **Important:** 
   - `NEXT_PUBLIC_SOCKET_URL` MUST point to your Railway backend URL
   - This is the most critical variable for realtime to work

3. **Deploy:**
   - Vercel will automatically build and deploy
   - No special configuration needed

## Verification

### Check Backend (Railway)
1. Open Railway logs
2. Look for: `✅ WebSocket server initialized at /socket.io-custom`
3. Check for any CORS errors

### Check Frontend (Vercel)
1. Open browser console
2. Look for: `🔌 [Client] Initializing Socket...`
3. Should see: `✅ [Client] CONNECTED! Socket ID: ...`
4. If you see errors about `NEXT_PUBLIC_SOCKET_URL`, it's not set correctly

### Test Realtime Features
1. Open app in two browser windows
2. Send a message - should appear instantly
3. Type in chat - should show typing indicator
4. Check online status - should update in real-time
5. Make a call - should work

## Troubleshooting

### Socket Not Connecting
- **Check:** `NEXT_PUBLIC_SOCKET_URL` is set in Vercel
- **Check:** Railway app is running and accessible
- **Check:** CORS allows your Vercel domain in `ALLOWED_ORIGINS`

### CORS Errors
- **Fix:** Add your Vercel URL to `ALLOWED_ORIGINS` in Railway
- Format: `https://your-app.vercel.app,https://your-custom-domain.com`

### Messages Not Sending
- **Check:** Socket is connected (browser console)
- **Check:** User is joined to socket room (check Railway logs)
- **Check:** MongoDB connection is working

### Typing Indicator Not Working
- **Check:** Socket connection is active
- **Check:** Both users are online
- **Check:** Browser console for errors

## Environment Variables Checklist

### Railway (Backend)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000` (or Railway assigned port)
- [ ] `HOSTNAME=0.0.0.0`
- [ ] `ALLOWED_ORIGINS` (comma-separated list of frontend URLs)
- [ ] `NEXT_PUBLIC_SOCKET_URL` (Railway app URL)
- [ ] `MONGODB_URI`
- [ ] `NEXTAUTH_SECRET`
- [ ] All other required env vars

### Vercel (Frontend)
- [ ] `NEXT_PUBLIC_SOCKET_URL` (Railway app URL - **CRITICAL**)
- [ ] `NEXTAUTH_URL` (Vercel app URL)
- [ ] `NEXTAUTH_SECRET` (same as Railway)
- [ ] `MONGODB_URI` (same as Railway)
- [ ] All other required env vars

## Notes

- Vercel cannot host Socket.io servers (serverless limitation)
- Railway is required for realtime features
- Both services need access to the same MongoDB database
- `NEXTAUTH_SECRET` should be the same in both environments

