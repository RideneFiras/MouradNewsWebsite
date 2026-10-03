# The publisher service (n8n/publisher/server.ts). Build context: the repository root, because it
# runs scripts/publish-article.ts and reads .claude/skills/publish-article/SKILL.md.
FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY scripts ./scripts
COPY src ./src
COPY n8n/publisher ./n8n/publisher
COPY .claude/skills/publish-article ./.claude/skills/publish-article
COPY tsconfig.json ./
ENV NODE_ENV=production DATA_DIR=/data PORT=8787
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8787
CMD ["node_modules/.bin/tsx", "n8n/publisher/server.ts"]
