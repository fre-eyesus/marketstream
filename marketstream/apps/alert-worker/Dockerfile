FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/alert-worker ./apps/alert-worker
RUN pnpm install --frozen-lockfile

FROM deps AS runner
WORKDIR /app/apps/alert-worker
ENV NODE_ENV=production
CMD ["pnpm", "start"]
