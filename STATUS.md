# Matrix Maze — Status

**Version:** 1.4.0 (8 levels)  
**As of:** 2026-07-16  
**SoT:** [Linear — Matrix Maze](https://linear.app/menhir-holdings/project/matrix-maze-194b0b7b0bd7)

## Shipped

- 8 levels, best times (localStorage), level-complete UI, run summary
- Tauri 2 desktop builds (Windows / macOS / Linux)
- Unified web at [matrix-maze.menhir-holdings.com](https://matrix-maze.menhir-holdings.com/) — sidebar, Play button, embedded WASM game
- WASM port (`GameBackend`), mobile touch controls, pointer-lock + keyboard
- Adaptive music (Kaiser stems + procedural fallback)
- Vercel deploy; GitHub releases proxy for desktop downloads

## In flight

| Issue | What |
|-------|------|
| [MT-99](https://linear.app/menhir-holdings/issue/MT-99) | Adaptive music L1–8, level SFX, pause audio — [PR #3](https://github.com/menhir-holdings/Matrix-Maze/pull/3) **In Review** |
| [MT-45](https://linear.app/menhir-holdings/issue/MT-45) | Windows spacebar on level-complete — [PR #5](https://github.com/menhir-holdings/Matrix-Maze/pull/5) **In Review** |

## Shipped (recent)

- [MT-102](https://linear.app/menhir-holdings/issue/MT-102) — Unified web at `/`; `/play` + `/dev` retired ([PR #4](https://github.com/menhir-holdings/Matrix-Maze/pull/4) merged)

## Next

| Issue | What |
|-------|------|
| [MT-65](https://linear.app/menhir-holdings/issue/MT-65) | Gold-path QA: cold load → all 8 levels in Chrome / Safari / Firefox |

## Backlog

Creature chase ([MT-46](https://linear.app/menhir-holdings/issue/MT-46)), mute toggle ([MT-48](https://linear.app/menhir-holdings/issue/MT-48) / [MT-67](https://linear.app/menhir-holdings/issue/MT-67)), lobby/fail/complete stingers ([MT-101](https://linear.app/menhir-holdings/issue/MT-101)), centered win ASCII ([MT-100](https://linear.app/menhir-holdings/issue/MT-100)), perf budget ([MT-69](https://linear.app/menhir-holdings/issue/MT-69)).

See [TODO.md](./TODO.md). In-flight work is tested via **Vercel PR preview** (not `/dev/` or `/play/`).
