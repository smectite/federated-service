# syntax=docker/dockerfile:1
# Multi-stage build for the users subgraph. Builds the whole workspace so the
# @app/core dependency resolves, then ships only what the service needs.
FROM node:20-slim AS build
WORKDIR /repo
COPY package.json package-lock.json* tsconfig.base.json tsconfig.json ./
COPY packages/core/package.json packages/core/
COPY services/users/package.json services/users/
COPY services/orders/package.json services/orders/
RUN npm install
COPY packages ./packages
COPY services ./services
RUN npm run build

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY package.json package-lock.json* tsconfig.base.json tsconfig.json ./
COPY packages/core/package.json packages/core/
COPY services/users/package.json services/users/
COPY services/orders/package.json services/orders/
RUN npm install --omit=dev
COPY --from=build /repo/packages/core/dist ./packages/core/dist
COPY --from=build /repo/services/users/dist ./services/users/dist
EXPOSE 4001
CMD ["node", "services/users/dist/index.js"]
