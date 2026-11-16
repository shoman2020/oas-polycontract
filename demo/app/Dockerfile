FROM node:24-alpine

WORKDIR /app
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node server.mjs ./server.mjs
COPY --chown=node:node tests ./tests

ENV PORT=8080
EXPOSE 8080

USER node

CMD ["node", "server.mjs"]
