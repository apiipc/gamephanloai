# API — build từ **gốc monorepo** (Railway: Root Directory trống; file mặc định `Dockerfile`)
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY apps/api/package.json ./
COPY apps/api/prisma ./prisma
RUN npm install --ignore-scripts
COPY apps/api/ .
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY apps/api/package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY apps/api/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push && node dist/src/main.js"]
