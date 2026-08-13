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

# next.config.mjs loads in production mode during `next build` and requires
# INTERNAL_ADMIN_URL. Runtime compose still overrides these.
ENV INTERNAL_ADMIN_URL=http://127.0.0.1:3005
ENV INTERNAL_BACKEND_URL=http://127.0.0.1:4001
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_URL=https://tranzit.az
ARG NEXTAUTH_URL=https://tranzit.az
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL

RUN npm run build

FROM base AS runtime

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=build /app /app

RUN mkdir -p /app/public/uploads /app/octo-admin/uploads /app/octo-admin/data /app/data /tmp /home/node

EXPOSE 3001 3005 4001

CMD ["npm", "run", "start"]
