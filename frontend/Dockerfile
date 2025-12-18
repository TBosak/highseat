# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Note: Using npm install instead of npm ci since package-lock.json is not committed
RUN npm install --legacy-peer-deps

# Copy source code and build scripts
COPY . .

# Build the Angular application (run prebuild scripts sequentially, then build)
# Use Angular CLI directly to bypass prebuild hook that requires concurrently
RUN npm run build:icons && \
    npm run consolidate:themes && \
    npx ng build --output-path=dist/browser

# The build output will be in /app/dist/browser
# This stage only produces build artifacts, no runtime needed
FROM scratch AS artifacts
COPY --from=builder /app/dist/browser /dist/browser
