# Build stage: compile React client
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build


# Runtime stage: Express server + built client
FROM node:20-alpine AS server

# Set Finland timezone so node-cron fires at the right local time
ENV TZ=Europe/Helsinki
ENV NODE_ENV=production
ENV DATA_DIR=/data

RUN apk add --no-cache tzdata

WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev

COPY server/ ./

# Copy compiled React app so Express can serve it as static files
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "src/index.js"]
