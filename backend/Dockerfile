FROM node:20-alpine

# apk upgrade: aplica los parches de Alpine (p. ej. openssl) publicados después
# de la imagen base, sin esperar a un node:20-alpine nuevo.
RUN apk upgrade --no-cache && apk add --no-cache python3 make g++ py3-requests py3-beautifulsoup4

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

# Carpeta de Entrenamientos → Videos (volumen apr_videos_data): al crearse el
# volumen hereda este dueño.
RUN mkdir -p /app/videos && chown -R node:node /app

USER node

EXPOSE 4000

CMD ["node", "src/server.js"]
