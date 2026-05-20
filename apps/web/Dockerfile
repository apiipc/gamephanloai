# Build static web (Vite). Railway: Root Directory = apps/web; deploy monorepo: `railway up . --service web` (repo root)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14.2.4
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
CMD ["sh", "-c", "serve dist -s -p ${PORT:-3000}"]
