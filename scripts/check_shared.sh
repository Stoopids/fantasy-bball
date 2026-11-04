#!/usr/bin/env bash
# Fails if this repo's shared/ differs from the other site's shared/ (or the local copy given as $1).
# Usage: scripts/check_shared.sh [path-to-other-shared-dir]
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)/shared"
other="${1:-}"
if [ -z "$other" ]; then
  url="${SHARED_OTHER_REPO_URL:?set SHARED_OTHER_REPO_URL or pass a path}"
  tmp="$(mktemp -d)"; git clone -q --depth 1 "$url" "$tmp/o"; other="$tmp/o/shared"
fi
[ -d "$other" ] || { echo "shared-check: other shared/ not found: $other"; exit 1; }
if diff -r -q "$here" "$other"; then echo "shared-check: OK (identical, version $(cat "$here/VERSION"))"; else echo "shared-check: FAIL, shared/ copies differ"; exit 1; fi
