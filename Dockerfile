FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable


FROM base AS build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r build
RUN pnpm deploy --filter=api --prod /prod/api
RUN pnpm deploy --filter=land --prod /prod/land
RUN pnpm run --filter=dash db:generate
RUN pnpm deploy --filter=dash --prod /prod/dash

FROM base AS land
ENV NODE_ENV production
COPY --from=build /prod/land /prod/land
WORKDIR /prod/land
EXPOSE 3000
CMD [ "npm", "run", "start" ]

FROM base AS dash
ENV NODE_ENV production
ENV PORT="3000"
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /prod/dash /prod/dash
WORKDIR /prod/dash
EXPOSE 3000
CMD [ "npm", "run", "start" ]

FROM base AS api
ENV NODE_ENV production
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /prod/api /prod/api
COPY --from=build /usr/src/app/apps/api/dist /prod/api/dist
COPY --from=build /usr/src/app/apps/api/api.yaml /prod/api/api.yaml
WORKDIR /prod/api
EXPOSE 3001
CMD [ "npm", "run", "start" ]

