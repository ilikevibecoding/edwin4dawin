#!/usr/bin/env python3
"""Verify every file in the portable Erdős #993 replay bundle."""

from __future__ import annotations

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "MANIFEST_SHA256.txt"
IGNORED_PARTS = {"__pycache__", ".pytest_cache"}


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest().upper()


def main() -> int:
    expected: dict[str, str] = {}
    for line_number, raw in enumerate(MANIFEST.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip() or raw.startswith("#"):
            continue
        try:
            wanted, relative = raw.split("  ", 1)
        except ValueError as exc:
            raise SystemExit(f"Malformed manifest line {line_number}: {raw!r}") from exc
        expected[relative.replace("\\", "/")] = wanted.upper()

    actual = {
        path.relative_to(ROOT).as_posix()
        for path in ROOT.rglob("*")
        if path.is_file()
        and path != MANIFEST
        and not any(part in IGNORED_PARTS for part in path.parts)
    }

    missing = sorted(set(expected) - actual)
    unexpected = sorted(actual - set(expected))
    altered = sorted(
        relative
        for relative in set(expected) & actual
        if digest(ROOT / relative) != expected[relative]
    )

    if missing or unexpected or altered:
        print("FAIL_PORTABLE_MANIFEST")
        for label, items in (("missing", missing), ("unexpected", unexpected), ("altered", altered)):
            for item in items:
                print(f"{label}: {item}")
        return 1

    print(f"PASS_PORTABLE_MANIFEST files={len(expected)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

