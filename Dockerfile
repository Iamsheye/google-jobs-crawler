FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl

COPY package.json yarn.lock ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN yarn install --frozen-lockfile

COPY prisma ./prisma/
RUN yarn prisma generate

COPY . .
RUN yarn build

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY scripts/start-production.sh ./scripts/start-production.sh

RUN chmod +x ./scripts/start-production.sh

EXPOSE 3333

ENTRYPOINT ["./scripts/start-production.sh"]
