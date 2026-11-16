ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-alpine

WORKDIR /workspace
RUN chown node:node /workspace
COPY --chown=node:node package.json .
USER node
RUN npm install --no-audit --no-fund
COPY --chown=node:node . .
CMD ["sh", "-c", "npx tsc --noEmit && npm test"]
