ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-alpine
ARG NPM_VERSION
RUN npm install --global "npm@${NPM_VERSION}" --no-audit --no-fund

WORKDIR /workspace
RUN chown node:node /workspace
COPY --chown=node:node package.json package-lock.json .npmrc ./
USER node
RUN npm ci --no-audit --no-fund
COPY --chown=node:node . .
CMD ["sh", "-c", "npx tsc --noEmit && npm test"]

