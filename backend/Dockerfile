FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

RUN chown -R node:node /app

USER node

EXPOSE 4000

CMD ["node", "src/server.js"]
