ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-alpine

WORKDIR /workspace
COPY package.json .
RUN npm install --no-audit --no-fund
COPY . .
CMD ["sh", "-c", "npx tsc --noEmit && npm test"]
