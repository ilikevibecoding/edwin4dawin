#!/usr/bin/env python3
"""Write SHA-256 manifest for the complete rank-eight V8 certificate."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_v8_alpha14_certificate_hashes_20260816.json"
CORE_NAMES = [
    "RANK8_V8_ALPHA14_FINITE_REDUCTION_2026-08-16.md",
    "scan_rank8_v8_forest_polynomials.py",
    "verify_forest_v8_medium_trees.rs",
    "assemble_rank8_v8_high_band_phases.py",
    "verify_rank8_v8_alpha14_finite_reduction.py",
    "write_rank8_v8_certificate_hashes.py",
    "rank8_v8_forest_polynomials_through_n20_exact_20260816.json",
    "rank8_v8_forest_orders21_24_exact_20260816.json",
    "rank8_v8_forest_orders25_29_exact_20260816.json",
    "rank8_v8_alpha14_finite_reduction_exact_20260816.json",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    core = {}
    for name in CORE_NAMES:
        path = HERE / name
        assert path.is_file(), f"missing core certificate file: {name}"
        core[name] = sha256(path)

    transcripts = {}
    for path in sorted(HERE.glob("rank8_v8_n*.out.log")):
        if path.stat().st_size == 0:
            continue
        error_path = path.with_name(path.name.replace(".out.log", ".err.log"))
        # The captured n27 PTY transcript predates redirected stderr; every
        # process-created transcript has a paired, empty stderr file.
        if path.name != "rank8_v8_n27_monolithic.out.log":
            assert error_path.is_file(), f"missing stderr file: {error_path.name}"
            assert error_path.stat().st_size == 0, f"nonempty stderr: {error_path.name}"
        transcripts[path.name] = sha256(path)

    payload = {
        "status": "PASS_HASHED_RANK8_V8_ALPHA14_CERTIFICATE",
        "hash": "SHA-256",
        "core_files": core,
        "exact_scan_transcripts": transcripts,
        "all_process_stderr_files_empty": True,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(OUTPUT.name, sha256(OUTPUT))


if __name__ == "__main__":
    main()
