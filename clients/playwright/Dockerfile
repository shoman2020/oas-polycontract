ARG NODE_VERSION
FROM node:${NODE_VERSION}-bookworm-slim

WORKDIR /workspace
RUN chown node:node /workspace
COPY --chown=node:node package.json .
USER node
RUN npm install --no-audit --no-fund
COPY --chown=node:node . .
CMD ["npm", "test"]

