#!/bin/sh
set -e
bun run db:migrate
bun run db:seed

exec bun run start
