# tests/ notes

## e2e_midswap_s28.js and SWAP_CMD
`SWAP_CMD` is a shell command the test runs mid-draft (after pick 30) to swap the files the mock app server serves from the old build to the new one, simulating a deploy during a live draft.

- Base build needed: the mock server must start serving a scratch copy of **s27c** (FBN_BUILD `2026-11-01s27c`); after the swap the files must be **s28** (`2026-11-02s28`). The test checks those two build strings.
- Example:
  ```
  cp -a /path/to/s27c-build /tmp/swapsite
  node tools/mock_textdb.js 23195 /tmp/swapsite 23196 &
  APP=http://localhost:23195 API=http://localhost:23196/api/data/ \
  SWAP_CMD='cp -a /workspace/fantasy-bball-releases/s28/. /tmp/swapsite/' node tests/e2e_midswap_s28.js
  ```
- Only ever swap a scratch copy; mock store only.
