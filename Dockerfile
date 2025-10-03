# Multi-stage Dockerfile for Pythoughts Platform
# Optimized for production with minimal image size and maximum security

# Stage 1: Dependencies
FROM node:20-alpine AS deps
LABEL stage=deps

WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json ./

# Install dependencies with npm ci for reproducible builds
RUN npm ci --prefer-offline --no-audit

# Stage 2: Builder
FROM node:20-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set environment variables for build
ENV NODE_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Build the application
RUN npm run build

# Stage 3: Development
FROM node:20-alpine AS development
LABEL stage=development

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy application source
COPY . .

# Expose development port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 4: Production
FROM nginx:alpine AS production
LABEL stage=production \
      maintainer="Pythoughts Team" \
      description="Pythoughts Platform - Production Image"

# Install Node.js for preview server (alternative to nginx)
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Install only production dependencies
RUN npm install -g serve

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start production server
CMD ["serve", "-s", "dist", "-l", "3000"]

# Alternative nginx configuration (comment above and uncomment below)
# FROM nginx:alpine AS production-nginx
# LABEL stage=production
#
# # Copy nginx configuration
# COPY nginx.conf /etc/nginx/nginx.conf
#
# # Copy built assets
# COPY --from=builder /app/dist /usr/share/nginx/html
#
# # Create non-root user
# RUN addgroup -g 1001 -S nginx-user && \
#     adduser -S nginx-user -u 1001
#
# # Expose port
# EXPOSE 80
#
# # Health check
# HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
#   CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1
#
# # Start nginx
# CMD ["nginx", "-g", "daemon off;"]
