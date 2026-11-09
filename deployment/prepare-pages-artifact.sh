#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 DESTINATION_DIRECTORY" >&2
  exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DESTINATION="$1"
ALLOWLIST="$SCRIPT_DIR/pages-allowlist.txt"

if [[ -e "$DESTINATION" && ! -d "$DESTINATION" ]]; then
  echo "Destination exists and is not a directory: $DESTINATION" >&2
  exit 2
fi
mkdir -p -- "$DESTINATION"

while IFS= read -r relative_path || [[ -n "$relative_path" ]]; do
  [[ -n "$relative_path" ]] || continue
  if [[ "$relative_path" == /* || "$relative_path" == *'..'* || "$relative_path" == *\\* ]]; then
    echo "Unsafe path in Pages allowlist: $relative_path" >&2
    exit 1
  fi
  if [[ "$relative_path" == "firestore.rules" || "$relative_path" == "firestore.indexes.json" ]]; then
    echo "Firestore configuration must not be in the Pages allowlist." >&2
    exit 1
  fi

  source_path="$REPO_ROOT/$relative_path"
  if [[ ! -f "$source_path" || -L "$source_path" ]]; then
    echo "Allowlisted production file is missing or is a symlink: $relative_path" >&2
    exit 1
  fi

  mkdir -p -- "$DESTINATION/$(dirname -- "$relative_path")"
  cp -- "$source_path" "$DESTINATION/$relative_path"
done < "$ALLOWLIST"

# GitHub Pages still needs its custom-domain marker in the published artifact.
printf '%s\n' 'app.resettable.co.uk' > "$DESTINATION/CNAME"
