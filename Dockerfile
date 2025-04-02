FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY server.js ./
COPY public ./public  

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
