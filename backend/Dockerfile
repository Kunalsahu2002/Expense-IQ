# Stage 1: Build & Prune
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY src ./src
COPY .env.example ./

# (Optional step for true production: run tests or compile TypeScript here if we were using it)

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
# We assume PORT 5000 inside the container
ENV PORT=5000

# Copy necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

# Expose the API port
EXPOSE 5000

# We don't run migrations automatically on start in large production apps (to avoid race conditions),
# but for a portfolio project, running `npx prisma db push` or `deploy` is acceptable.
# We will just start the server and assume the DB is managed externally.
CMD ["npm", "start"]
