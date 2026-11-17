ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-bookworm-slim

WORKDIR /workspace
RUN chown node:node /workspace
COPY --chown=node:node package.json package-lock.json ./
USER node
RUN npm ci --no-audit --no-fund
COPY --chown=node:node . .
CMD ["npm", "test"]

