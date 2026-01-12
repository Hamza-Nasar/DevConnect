# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine AS base

# Install dependencies for building native modules (if any)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false --silent

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --silent && npm cache clean --force

# Copy built application from build stage
COPY --from=base --chown=nextjs:nodejs /app/.next ./.next
COPY --from=base --chown=nextjs:nodejs /app/dist ./dist
COPY --from=base --chown=nextjs:nodejs /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/server ./server
COPY --from=base --chown=nextjs:nodejs /app/lib ./lib
COPY --from=base --chown=nextjs:nodejs /app/types ./types
COPY --from=base --chown=nextjs:nodejs /app/app ./app
COPY --from=base --chown=nextjs:nodejs /app/components ./components
COPY --from=base --chown=nextjs:nodejs /app/tsconfig*.json ./
COPY --from=base --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=base --chown=nextjs:nodejs /app/next-env.d.ts ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application using dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]