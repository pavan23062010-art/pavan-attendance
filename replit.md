# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## GitHub Push (Pending Setup)

The user wants to push this project to GitHub. To connect GitHub in future sessions:
- **Option A (preferred):** Use the Replit GitHub integration — go to Tools → Integrations → GitHub → Connect
- **Option B (manual):** Ask user for:
  1. A new empty GitHub repo URL (e.g. `https://github.com/pavan23062010-art/pavan-attendance`)
  2. A GitHub Personal Access Token (classic) with `repo` scope (starts with `ghp_`)
  Then run:
  ```bash
  git remote add origin https://<TOKEN>@github.com/pavan23062010-art/<REPO>.git
  git push -u origin main
  ```
