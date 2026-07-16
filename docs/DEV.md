# Matrix Maze — dev staging

## URLs

| Environment | Branch | URL |
|-------------|--------|-----|
| Production | `main` | https://matrix-maze.menhir-holdings.com/play/ |
| Dev staging | `dev` | https://matrix-maze.menhir-holdings.com/dev/ |

Landing shell (`/`) always loads `/play/`. The `/dev/` path serves the latest build from the `dev` branch.

## Workflow

1. Open a Linear issue (Menhir Tech / Matrix Maze).
2. Branch from `dev`: `git checkout dev && git pull && git checkout -b ledoit/mt-XX-short-title`
3. Edit source under `app/src/` (and Rust under `app/src-tauri/` if needed).
4. Push the branch and open a PR **into `dev`** (not `main`).
5. Merge to `dev` → GitHub Action builds WASM + `/dev` bundle, commits `dev/`, Vercel deploys.
6. Test at `/dev/` on the live domain.
7. When ready for production: PR `dev` → `main`, run `npm run build:web` locally (or CI), commit `play/`, merge.

## Local

```bash
cd app
npm run dev          # hot reload
npm run build:web:dev && npx vite preview --base /dev/
```

## Linear

Reference the issue in commits: `MT-123: description`. Linear GitHub integration links PRs automatically when branch names include the issue id.
