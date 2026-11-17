ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-alpine

WORKDIR /workspace
RUN chown node:node /workspace
COPY --chown=node:node package.json package-lock.json .npmrc ./
USER root
RUN apk add --no-cache --virtual .npm-git-deps git
USER node
RUN npm ci --no-audit --no-fund
USER root
RUN apk del .npm-git-deps
USER node
COPY --chown=node:node . .
CMD ["sh", "-c", "npx tsc --noEmit && npm test"]


