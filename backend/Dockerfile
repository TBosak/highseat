# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
# Note: Using npm install instead of npm ci since package-lock.json is not committed
RUN npm install --legacy-peer-deps

# Copy frontend source
COPY frontend ./

# Build frontend (run prebuild scripts sequentially, then build)
# Use Angular CLI directly to bypass prebuild hook that requires concurrently
RUN npm run build:icons && \
    npm run consolidate:themes && \
    npx ng build --output-path=dist/browser

# Stage 2: Backend base
FROM oven/bun:1 AS base
WORKDIR /app

# Stage 3: Install backend dependencies
FROM base AS deps
COPY backend/package.json backend/bun.lockb* ./
RUN bun install --frozen-lockfile

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app

# Copy backend dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY backend ./

# Copy built frontend from frontend-builder stage
# Backend expects frontend at ../frontend/dist/browser/browser relative to /app
COPY --from=frontend-builder /build/dist/browser/browser /frontend/dist/browser/browser

# Create necessary directories for runtime
RUN mkdir -p /app/uploads /app/db

# Expose port
EXPOSE 3350

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3350/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Run database init and start server
CMD ["bun", "run", "start:production"]
