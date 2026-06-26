FROM python:3.11-slim AS builder

WORKDIR /build

# Copy source
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build index.html
RUN python3 scripts/build_platform.py

# ── Production image ─────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Copy built site
COPY --from=builder /build/public /usr/share/nginx/html

# Copy nginx config
COPY deploy/nginx.docker.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ | grep -q "Finance AI Platform" || exit 1

LABEL org.opencontainers.image.title="CloseIQ"
LABEL org.opencontainers.image.description="Tiger Analytics Autonomous Month-End Close"
LABEL org.opencontainers.image.vendor="Tiger Analytics"
