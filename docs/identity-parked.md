# Maze identity — compressed (MT-240)

Cut phase 2026-09-22. **Do not implement until focus unpauses.**

Need: users keep working on hiscores across sessions. That is the whole identity surface for now.

Linear: MT-240

## In

- Durable player id + handle that survives reload and new tabs on the **same browser** (already local `mm-player` in `account.js`)
- Durable **store** for the board (Vercel KV or Blob — not in-process memory on production). `GET /api/scores` must not report `store: "memory"` on production
- Same handle can post again later and update their row

## Out (cut hard)

- Path-walk as password / no-Forgot / monument lock / beat-old-score-to-rename
- Email, OAuth, Clerk, passkeys, recovery easter eggs
- Flair, achievements, identicon, pfp, skip-to-finish badge rules

If a later ego product is wanted, open a new issue after Consigliere. This file is persistence only.

---

## Historical (not scope)

The 17 Sep monument brief (path-walk secret, no reset, sealed names, Konami spare key) is parked, not scheduled. Do not implement from this appendix.
