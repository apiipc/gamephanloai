# Unified: **web** (Vite `dist`) + **API** (Nest) — một process, một cổng `PORT`.
# Railway: Root Directory để trống, không cần `RAILWAY_DOCKERFILE_PATH` trên service này.
# Frontend gọi API cùng origin: `/api/...` (không cần `VITE_API_URL`).

FROM node:20-bookworm-slim AS web-build
WORKDIR /web
COPY apps/web/package.json ./
RUN npm install
COPY apps/web/ .
RUN npm run build

FROM node:20-bookworm-slim AS api-build
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
ENV WEB_DIST_PATH=/app/web-dist
ENV SEED_ITEMS_MANIFEST=/app/seed-assets/items-manifest.json
COPY apps/api/package.json ./
COPY apps/api/prisma ./prisma
# Runtime needs install scripts for native deps like bcrypt.
RUN npm install --omit=dev
COPY --from=api-build /app/dist ./dist
COPY --from=api-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=api-build /app/node_modules/@prisma ./node_modules/@prisma
COPY apps/web/public/assets/items-manifest.json /app/seed-assets/items-manifest.json
COPY --from=web-build /web/dist ./web-dist
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]
