FROM node:22-alpine

WORKDIR /app
COPY package.json ./package.json
COPY server.mjs ./server.mjs
COPY tests ./tests

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]
