# TODO List

Linear is authoritative: Matrix Maze project. This file mirrors open work for repo readers.

## Parked (do not start until focus unpauses)

- MT-240 — durable hiscores across sessions (KV/Blob, not memory on prod). Compressed identity. See `docs/identity-parked.md`.

## 1. Center level-complete ASCII art — MT-100 (Backlog)

Center win ASCII art the same way times and other messages are centered.

## 2. Music and sound effects — MT-101 (Backlog)

**Done:** Adaptive level gameplay stems, level-complete stinger, pause audio (MT-99).

**Open:**

- Lobby music
- Level failed stinger
- Game-complete stinger

Sync stems: `npm run music:sync` from Kaiser.

## 3. Audio mute toggle — MT-48 / MT-67 (Backlog)

First-gesture unlock done. Mute UI + persisted preference still open.

## 4. Perf budget — MT-69 (Backlog)

Define ASCII raycast FPS floor and document WASM bundle size.

## Later (cut from MT-223)

- Ghost replay of a recorded input path (`R` today only regenerates the maze)

## Canceled

- MT-46 — Creature chase (cut from v1)
- MT-71 — Creature browser parity (depends on MT-46)
- Monument / path-walk account (cut 2026-09-22; replaced by MT-240)

## Triaged

MT-57 — items above are ticketed; close when accepted.
