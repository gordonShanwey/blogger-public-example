FROM node:22-alpine AS builder

WORKDIR /app

# Install all dependencies including dev dependencies for build
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Start fresh with a new stage for the production image
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application from the builder stage
COPY --from=builder /app/dist ./dist

# Set production environment
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the application using the compiled JavaScript
CMD ["node", "dist/index.js"] 