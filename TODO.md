# TODO List

Linear is authoritative: [Matrix Maze project](https://linear.app/menhir-holdings/project/matrix-maze-194b0b7b0bd7). This file mirrors open work for repo readers.

## 1. Windows spacebar on level complete — [MT-45](https://linear.app/menhir-holdings/issue/MT-45) (In Progress)

Spacebar on Windows fails to advance from level-complete overlay reliably.

**Mitigations shipped:** tap/click on viewport advances when won; `advanceIfWon()` debounce (PR #3).

**Notes:** See `SPACEBAR_ISSUES.md`.

## 2. Center level-complete ASCII art — [MT-100](https://linear.app/menhir-holdings/issue/MT-100) (Backlog)

Center win ASCII art the same way times and other messages are centered.

## 3. Music and sound effects — [MT-101](https://linear.app/menhir-holdings/issue/MT-101) (Backlog)

**Done:** Adaptive level gameplay stems (`app/src/music.js` + Kaiser). Level-complete stinger / pause audio on [PR #3](https://github.com/menhir-holdings/Matrix-Maze/pull/3) ([MT-99](https://linear.app/menhir-holdings/issue/MT-99)).

**Open:**

- Lobby music
- Level failed stinger
- Game-complete stinger
- Creature teleport SFX (blocked on [MT-46](https://linear.app/menhir-holdings/issue/MT-46))

Sync stems: `npm run music:sync` from Kaiser. Preview mixes at [kaiser.menhir-holdings.com](https://kaiser.menhir-holdings.com).

## 4. Chasing creature — [MT-46](https://linear.app/menhir-holdings/issue/MT-46) (Backlog)

Creature spawns behind player, chases at same speed, fail screen on catch, dead-end teleport with freeze beat. Browser parity tracked in [MT-71](https://linear.app/menhir-holdings/issue/MT-71).

## 5. Audio mute toggle — [MT-48](https://linear.app/menhir-holdings/issue/MT-48) / [MT-67](https://linear.app/menhir-holdings/issue/MT-67) (Backlog)

First-gesture unlock done. Mute UI + persisted preference still open.

## 6. Gold-path browser QA — [MT-65](https://linear.app/menhir-holdings/issue/MT-65) (Todo)

Cold load → Play → complete all **8 levels** → finish run in Chrome, Safari, Firefox without desktop install.

## 7. Perf budget — [MT-69](https://linear.app/menhir-holdings/issue/MT-69) (Backlog)

Define ASCII raycast FPS floor and document WASM bundle size.

## Triaged

[MT-57](https://linear.app/menhir-holdings/issue/MT-57) — items above are ticketed; close when accepted.
