FROM oven/bun:1.3.5 AS builder
WORKDIR /app

# Memory limit for build (can be overridden via --build-arg)
ARG NODE_OPTIONS="--max-old-space-size=1536"
ENV NODE_OPTIONS=${NODE_OPTIONS}

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.3.5
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=/data/sqlite.db

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/tsconfig.json /app/server.ts /app/

# Migrations and seed run at startup (see entrypoint.sh)
COPY --from=builder /app/drizzle.config.ts /app/drizzle.config.ts
COPY --from=builder /app/drizzle /app/drizzle
COPY --from=builder /app/scripts /app/scripts
COPY --from=builder /app/src/lib /app/src/lib
COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh && mkdir -p /data
VOLUME /data
EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
