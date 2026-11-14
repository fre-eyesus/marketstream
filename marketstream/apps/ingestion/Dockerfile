FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/ingestion ./apps/ingestion
RUN pnpm install --frozen-lockfile
RUN pnpm build:packages

FROM deps AS runner
WORKDIR /app/apps/ingestion
ENV NODE_ENV=production
CMD ["pnpm", "start"]
