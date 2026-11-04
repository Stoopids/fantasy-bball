# shared/ — UI code used by BOTH sites

Source of truth: `stoopids/stoopids` → `shared/`.
A copy lives in `Stoopids/fantasy-bball` → `shared/`, updated ONLY by the
`shared-sync` pull request (never by hand, never pushed to main automatically).

Rules
- Only files inside `shared/` are synced. Data files (`data.js`, `data.json`, `bets.json`, `data/`, `archive.*`)
  and refresh workflows are never touched.
- Phase 0: nothing here is loaded by either site yet (no behaviour change).
- Both copies must be byte-identical; `scripts/check_shared.sh` and the `shared-check` workflow fail otherwise.
- Bump `VERSION` on every change (used later for cache-busting).
