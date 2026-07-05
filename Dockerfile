# Stage 1: Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]
