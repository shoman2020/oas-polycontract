ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-alpine

WORKDIR /app
COPY --chown=node:node server.mjs ./server.mjs

ENV PORT=8082
EXPOSE 8082

USER node

CMD ["node", "server.mjs"]
