"""Write a SHA256 manifest of every source file and report in this directory."""

from __future__ import annotations

import hashlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
EXCLUDE_DIRS = {"__pycache__", ".git"}
EXCLUDE_FILES = {"MANIFEST.sha256.json"}
BINARY_SKIP_EXT = {".o", ".pyc"}


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    entries = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDE_DIRS)
        for fn in sorted(filenames):
            if fn in EXCLUDE_FILES or os.path.splitext(fn)[1] in BINARY_SKIP_EXT:
                continue
            full = os.path.join(dirpath, fn)
            if os.access(full, os.X_OK) and not fn.endswith((".py", ".sh", ".c", ".md", ".json", ".txt", "Makefile")):
                continue  # compiled binaries
            rel = os.path.relpath(full, ROOT)
            entries[rel] = {"sha256": sha256_of(full), "bytes": os.path.getsize(full)}
    out = os.path.join(ROOT, "reports", "MANIFEST.sha256.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as fh:
        json.dump(entries, fh, indent=1, sort_keys=True)
    print(f"{len(entries)} files hashed -> {os.path.relpath(out, ROOT)}")
    if "--print" in sys.argv:
        for k, v in entries.items():
            print(f"{v['sha256']}  {k}")


if __name__ == "__main__":
    main()
