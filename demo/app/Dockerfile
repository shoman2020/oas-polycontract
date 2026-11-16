ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-alpine

WORKDIR /app
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node server.mjs ./server.mjs
COPY --chown=node:node tests ./tests

# This demo has no install-time dependencies. Exclude package managers from
# the runtime image to reduce its attack surface and avoid unused packages.
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack

ENV PORT=8080
EXPOSE 8080

USER node

CMD ["node", "server.mjs"]
