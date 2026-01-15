FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund --legacy-peer-deps

COPY dist ./dist

CMD ["npm", "run", "start:prod"]
