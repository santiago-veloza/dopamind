# Una sola Dockerfile para todos los servicios: docker build --build-arg SERVICE=task .
FROM node:22-alpine AS deps
ARG SERVICE
WORKDIR /app
COPY package.json package-lock.json ./
COPY libs libs
COPY services services
# solo las dependencias de producción de este servicio
RUN npm ci --omit=dev --workspace=services/${SERVICE} --include-workspace-root=false

FROM node:22-alpine
ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY libs libs
COPY services/${SERVICE} services/${SERVICE}
WORKDIR /app/services/${SERVICE}
USER node
CMD ["node", "src/index.js"]
