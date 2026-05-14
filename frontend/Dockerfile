FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --chown=nonroot:nonroot --from=builder /app/.next/standalone ./
COPY --chown=nonroot:nonroot --from=builder /app/.next/static ./.next/static
COPY --chown=nonroot:nonroot --from=builder /app/public ./public

EXPOSE 3000

USER nonroot

CMD ["server.js"]
