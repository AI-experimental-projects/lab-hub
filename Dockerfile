# syntax=docker/dockerfile:1

FROM node:25-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Runtime: only the standalone server, static assets and content. Runs as non-root.
FROM node:25-alpine AS runtime
WORKDIR /app
# Commit the image was built from; reported by /status.
ARG LAB_VERSION=dev
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    LAB_VERSION=$LAB_VERSION \
    LAB_DB_PATH=/data/lab.db

COPY --from=build --chown=1001:1001 /app/.next/standalone ./
COPY --from=build --chown=1001:1001 /app/.next/static ./.next/static
COPY --from=build --chown=1001:1001 /app/public ./public
# Read at runtime when pages revalidate.
COPY --from=build --chown=1001:1001 /app/content ./content

USER 1001:1001
EXPOSE 8080
CMD ["node", "server.js"]
