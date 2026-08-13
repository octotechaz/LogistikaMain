FROM node:22-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps

COPY package*.json npm-shrinkwrap.json* ./
COPY prisma ./prisma
RUN npm ci --include=dev --ignore-scripts
RUN npx prisma generate

FROM deps AS build

COPY . .
RUN npm run build

FROM base AS runtime

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=build /app /app

RUN mkdir -p /app/public/uploads /app/octo-admin/uploads /app/octo-admin/data /app/data /tmp /home/node

EXPOSE 3001 3005 4001

CMD ["npm", "run", "start"]
