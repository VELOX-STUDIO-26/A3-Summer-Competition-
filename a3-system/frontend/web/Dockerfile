# Frontend Dockerfile - Development Mode
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat curl

# Set environment variables
ENV NODE_ENV=development \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the app
COPY . .

EXPOSE 3000

# Use npm run dev for development with hot reload
CMD ["npm", "run", "dev"]
