# Matrix Maze — Status

**Version:** 1.4.0 (8 levels)  
**As of:** 2026-09-22  
**SoT:** Linear — Matrix Maze  
**Checkout:** `personal/Stonehenge/Game/Matrix-Maze`  
**Bookmark:** [https://matmaz.vercel.app](https://matmaz.vercel.app)

## Shipped

- 8 levels, best times (localStorage), level-complete UI, run summary
- Tauri 2 desktop builds (Windows / macOS / Linux)
- Unified web at `/` — Play overlay, embedded WASM game at `/game/`
- WASM port (`GameBackend`), mobile touch controls, pointer-lock + keyboard
- Adaptive music L1–8, level-complete stinger, pause audio (MT-99)
- Gold-path QA automation (MT-65)
- Vercel deploy; GitHub releases proxy for desktop downloads
- `/play` + `/dev` retired (MT-102)
- Web shell restyle (cabinet/title overlay) (MT-208)
- Compact LEVEL START plate, Skip to finish, local handle + hiscores (MT-223 / MT-230)
- Tab / desktop mark is Bench take **D** (T-junction), not the runner or 32px wordmark

## Parked (cut phase)

- Durable hiscores across sessions — compressed identity, not monument accounts (MT-240). Do not implement until focus unpauses. Scope: `docs/identity-parked.md`

## Shell vs WASM

| Lives in web chrome (`/`) | Lives in the game view (`/game/` WASM) |
|---|---|
| Title, Play/Resume, **Skip to finish**, handle, pause, controls, download | Maze sim, raycast, movement, level timer |
| Finish handle confirm + hiscores + player profile | L1–7 complete ASCII, `SPACE` next, `R` replay |
| Esc overlay | Pointer-lock look, touch pad, in-run HUD |

One hop after level 8: game posts `run-complete`, shell shows the plate. No extra lobby.

**Cut:** ghost replay of a recorded path. `R` regenerates the maze and keeps the run.

## Backlog

Mute toggle (MT-48 / MT-67), lobby/fail/complete stingers (MT-101), centered win ASCII (MT-100), perf budget (MT-69).

**Cut from v1:** creature chase (MT-46 canceled).

See [TODO.md](./TODO.md).
