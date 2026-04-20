# =====================================================================
# Dockerfile - Frontend (Vite + React)
# Multi-stage build:
#   Stage 1 (builder): npm build → output dist/
#   Stage 2 (runner):  serve dengan nginx (ringan & cepat)
# =====================================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files dulu untuk cache layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy semua source
COPY . .

# Build production bundle
RUN npm run build

# --- Stage 2: Serve dengan Nginx ---
FROM nginx:alpine

# Hapus default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy hasil build dari stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
