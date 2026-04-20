# =====================================================================
# Dockerfile - Backend (Go)
# Multi-stage build:
#   Stage 1 (builder): compile Go binary
#   Stage 2 (runner):  jalankan binary yang sudah dikompil (image kecil)
# =====================================================================

# --- Stage 1: Build ---
FROM golang:1.24-alpine AS builder

# Install dependensi build (gcc diperlukan beberapa library CGO)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy go.mod & go.sum dulu agar layer cache efisien
COPY go.mod go.sum ./
RUN go mod download

# Copy semua source code
COPY . .

# Build binary statis untuk Linux
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/server .

# --- Stage 2: Run ---
FROM alpine:3.19

# Timezone & SSL certs
RUN apk add --no-cache tzdata ca-certificates

WORKDIR /app

# Copy binary dari stage builder
COPY --from=builder /app/server .

# Copy folder assets (font PDF, dll) jika ada
COPY --from=builder /app/assets ./assets

EXPOSE 8080
EXPOSE 2055/udp
EXPOSE 6343/udp

CMD ["/app/server"]
