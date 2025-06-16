# Dockerfile

# --- Stage 1: The "Builder" ---
# This stage is perfect and needs no changes.
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install
COPY . .

ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_API_URL

RUN npm run build


# --- Stage 2: The "Runner" ---
# We will make small corrections in this stage.
FROM node:18-alpine
WORKDIR /app

# --- FIX 1: Simplify user and group creation ---
# This creates a group named 'nextjs' and a user named 'nextjs' and adds the user to the group.
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# --- FIX 2: Correct the ownership in the COPY command ---
# We now chown to the 'nextjs' user and the 'nextjs' group.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Switch to our non-root user
USER nextjs

# Expose the port Next.js will run on
EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "start"]