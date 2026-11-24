FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG BACKEND_URL
ARG NEXT_PUBLIC_API_URL
ENV APP_ENV=staging BACKEND_URL=${BACKEND_URL} NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} NEXT_PUBLIC_USE_MOCK_API=false
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
ENV NODE_ENV=production APP_ENV=staging NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
