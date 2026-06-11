#!/bin/sh
set -e

# Ensure the SQLite data dir exists (it lives on a mounted volume at runtime),
# apply pending migrations, then start the server.
mkdir -p /app/data/database

npx prisma migrate deploy

exec node dist/server.js
