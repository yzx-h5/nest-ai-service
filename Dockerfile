FROM node:24.12.0-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build && pnpm prune --prod

FROM node:24.12.0-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 10001 app \
  && useradd --system --uid 10001 --gid app --create-home app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=app:app --from=builder /app/node_modules ./node_modules
COPY --chown=app:app --from=builder /app/dist ./dist
COPY --chown=app:app --from=builder /app/public ./public

USER app

EXPOSE 3000

CMD ["node", "dist/main"]
