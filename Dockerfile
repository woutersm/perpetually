FROM oven/bun:1.3.5 AS builder
WORKDIR /app

# Memory limit for build (can be overridden via --build-arg)
ARG NODE_OPTIONS="--max-old-space-size=1536"
ENV NODE_OPTIONS=${NODE_OPTIONS}

COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

FROM oven/bun:1.3.5
WORKDIR /app
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

COPY --from=builder /app/drizzle.config.ts /app/drizzle.config.ts
COPY --from=builder /app/drizzle /app/drizzle
COPY --from=builder /app/scripts /app/scripts
COPY --from=builder /app/src/lib /app/src/lib

COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
