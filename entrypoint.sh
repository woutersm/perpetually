#!/bin/sh
set -e
bun run db:migrate

# The seeded test account has a well-known password; never create it on a public demo
if [ "$DEMO_MODE" != "true" ]; then
  bun run db:seed
fi

exec bun run start
