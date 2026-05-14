FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force


FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4002

COPY --chown=nonroot:nonroot --from=deps /app/node_modules ./node_modules
COPY --chown=nonroot:nonroot package*.json ./
COPY --chown=nonroot:nonroot src ./src

EXPOSE 4002

USER nonroot

CMD ["src/index.js"]
