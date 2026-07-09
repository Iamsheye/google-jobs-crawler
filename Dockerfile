FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN yarn install --frozen-lockfile

COPY prisma ./prisma/
RUN yarn prisma generate

COPY . .
RUN yarn build

FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY scripts/start-production.sh ./scripts/start-production.sh

RUN chmod +x ./scripts/start-production.sh

# Install Chromium and the system libraries required by Playwright.
# This is done in the final runtime image so the daily scraper works immediately.
RUN yarn run playwright install chromium && \
    yarn run playwright install-deps chromium

# Prevent accidental browser downloads at runtime; fail fast if Chromium is missing.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

EXPOSE 3333

ENTRYPOINT ["./scripts/start-production.sh"]
