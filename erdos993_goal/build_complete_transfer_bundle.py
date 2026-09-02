#!/usr/bin/env python3
"""Build a comprehensive, hash-pinned transfer ZIP for Erdős #993."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import sys
import time
import zipfile


ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "portable"
OUTPUT = OUTPUT_DIR / "erdos993_complete_transfer_2026-09-02.zip"
SIDECAR_MANIFEST = OUTPUT_DIR / "erdos993_complete_transfer_2026-09-02_MANIFEST_SHA256.txt"

BLOCKED_DIR_NAMES = {
    ".git",
    ".mypy_cache",
    ".pytest_cache",
    ".venv",
    "_tmp_bbl",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "portable",
    "target",
    "venv",
}

BLOCKED_SUFFIXES = {
    ".bin",
    ".class",
    ".db",
    ".dll",
    ".dylib",
    ".exe",
    ".gz",
    ".lock",
    ".o",
    ".obj",
    ".partial",
    ".pdb",
    ".pyd",
    ".pyc",
    ".pyo",
    ".so",
    ".sqlite",
    ".sqlite3",
    ".tmp",
    ".wasm",
    ".whl",
}


def sha256_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest().upper()


def transferable(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if any(blocked_directory(part) for part in relative.parts[:-1]):
        return False
    return path.suffix.lower() not in BLOCKED_SUFFIXES


def blocked_directory(name: str) -> bool:
    lowered = name.lower()
    return lowered in BLOCKED_DIR_NAMES or lowered.startswith("_tmp")


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if OUTPUT.exists() or SIDECAR_MANIFEST.exists():
        raise SystemExit("Refusing to overwrite an existing complete transfer bundle")

    candidates: list[Path] = []
    excluded_count = 0
    excluded_bytes = 0
    skipped_paths: list[str] = []
    for directory, dirnames, filenames in os.walk(ROOT):
        directory_path = Path(directory)
        dirnames[:] = sorted(
            name for name in dirnames if not blocked_directory(name)
        )
        for filename in sorted(filenames):
            path = directory_path / filename
            try:
                size = path.stat().st_size
            except OSError as error:
                relative = path.relative_to(ROOT).as_posix()
                skipped_paths.append(f"{relative} :: {type(error).__name__}: {error}")
                continue
            if transferable(path):
                candidates.append(path)
            else:
                excluded_count += 1
                excluded_bytes += size

    candidates.sort(key=lambda path: path.relative_to(ROOT).as_posix().lower())
    selected_bytes = sum(path.stat().st_size for path in candidates)
    print(
        f"SELECTED files={len(candidates)} bytes={selected_bytes} "
        f"excluded_files={excluded_count} excluded_bytes={excluded_bytes} "
        f"unreadable_paths={len(skipped_paths)}",
        flush=True,
    )

    partial = OUTPUT.with_name(OUTPUT.name + f".inprogress.{os.getpid()}")
    if partial.exists():
        raise SystemExit(f"Refusing to overwrite partial archive: {partial}")

    manifest_lines: list[str] = []
    started = time.monotonic()
    processed_bytes = 0
    with zipfile.ZipFile(
        partial,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=6,
        allowZip64=True,
    ) as archive:
        for index, path in enumerate(candidates, 1):
            relative = path.relative_to(ROOT).as_posix()
            try:
                before = path.stat()
                digest = sha256_file(path)
                after_hash = path.stat()
            except OSError as error:
                skipped_paths.append(
                    f"{relative} :: {type(error).__name__}: {error}"
                )
                continue
            if (before.st_size, before.st_mtime_ns) != (
                after_hash.st_size,
                after_hash.st_mtime_ns,
            ):
                raise RuntimeError(f"File changed while hashing: {relative}")
            archive.write(path, relative)
            after_zip = path.stat()
            if (after_hash.st_size, after_hash.st_mtime_ns) != (
                after_zip.st_size,
                after_zip.st_mtime_ns,
            ):
                raise RuntimeError(f"File changed while archiving: {relative}")
            manifest_lines.append(f"{digest}  {relative}")
            processed_bytes += before.st_size
            if index % 500 == 0 or time.monotonic() - started >= 45:
                elapsed = time.monotonic() - started
                print(
                    f"PROGRESS files={index}/{len(candidates)} "
                    f"bytes={processed_bytes}/{selected_bytes} elapsed_s={elapsed:.1f}",
                    flush=True,
                )
                started = time.monotonic()

        if skipped_paths:
            skipped_text = (
                "The operating system enumerated these paths but could not open them.\n"
                "They are recorded here and were not silently treated as evidence.\n\n"
                + "\n".join(skipped_paths)
                + "\n"
            )
            skipped_name = "UNTRANSFERABLE_PATHS.txt"
            archive.writestr(skipped_name, skipped_text)
            skipped_hash = hashlib.sha256(skipped_text.encode("utf-8")).hexdigest().upper()
            manifest_lines.append(f"{skipped_hash}  {skipped_name}")

        manifest_text = "\n".join(manifest_lines) + "\n"
        archive.writestr("MANIFEST_SHA256.txt", manifest_text)

    partial.replace(OUTPUT)
    SIDECAR_MANIFEST.write_text(manifest_text, encoding="utf-8", newline="\n")
    archive_hash = sha256_file(OUTPUT)
    print(
        f"PASS_COMPLETE_TRANSFER files={len(candidates)} "
        f"zip_bytes={OUTPUT.stat().st_size} sha256={archive_hash}",
        flush=True,
    )
    print(f"OUTPUT={OUTPUT}", flush=True)
    print(f"MANIFEST={SIDECAR_MANIFEST}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
