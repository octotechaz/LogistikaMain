#!/bin/bash
set -Eeuo pipefail

node scripts/validate-production-env.mjs

./node_modules/.bin/prisma migrate deploy

exec node scripts/container-supervisor.mjs
