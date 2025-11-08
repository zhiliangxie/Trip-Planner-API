# Stage 1: build
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY jest.config.cjs ./        
COPY prisma ./prisma
COPY src ./src
COPY test ./test              

RUN npx prisma generate
RUN npm run build

# Stage 2: test
FROM build AS test
ENV NODE_ENV=test
CMD ["npm", "test"]

# Stage 3: runtime
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

ENV PORT=3000
CMD ["node", "dist/index.js"]
