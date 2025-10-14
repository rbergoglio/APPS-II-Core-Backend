# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /var/api
COPY package*.json ./
RUN npm ci --no-audit --no-fund --prefer-offline --loglevel=warn --jobs=2
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-alpine
WORKDIR /var/api
ENV NODE_ENV=production \
    PORT=8080
COPY --from=build /var/api/dist ./dist
COPY --from=build /var/api/package*.json ./
COPY .docs ./.docs
RUN npm ci --omit=dev --no-audit --no-fund --prefer-offline --loglevel=warn --jobs=2
EXPOSE 8080
# /healthz debe existir y ser barato
CMD ["node", "dist/server.js"]
