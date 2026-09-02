#!/usr/bin/env python3
"""Compile, run, and seal one checked-i128 all-short cubic root orbit."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RUST = ROOT / "verify_rank8_delta01_e3_cubic_all_short_fast_agent.rs"
EXE = ROOT / "verify_rank8_delta01_e3_cubic_all_short_fast_agent.exe"
EXPECTED = {
    "verify_rank8_delta01_e3_cubic_all_short_fast_agent.rs":
        "A614ED04B160C695FFAA66176CC851A2AB8BCA9CB571407DEC1AD62E28813209",
    "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json":
        "480650229492873FAFD07B480E867C4EC0C00A09BDCF883BEC37DA60D725FD19",
}
COUNTS = {
    "outer_branch": 80652,
    "middle_branch": 40553,
    "outer_leaf": 182356,
    "middle_leaf": 53218,
    "outer_pendant_internal": 2349983,
    "middle_pendant_internal": 676950,
    "spine_internal": 1286834,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", choices=tuple(COUNTS), required=True)
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    compiler = subprocess.run(
        ["rustup", "run", "stable-x86_64-pc-windows-gnu", "rustc", "--version"],
        cwd=ROOT, check=True, text=True, capture_output=True,
    ).stdout.strip()
    subprocess.run([
        "rustup", "run", "stable-x86_64-pc-windows-gnu", "rustc", "-O",
        "-C", "overflow-checks=yes", str(RUST), "-o", str(EXE),
    ], cwd=ROOT, check=True)
    executable_hash = sha256(EXE)
    expected_count = COUNTS[args.root]
    completed = subprocess.run(
        [str(EXE), args.root, "0", str(expected_count)],
        cwd=ROOT, check=True, text=True, capture_output=True,
    )
    stdout = completed.stdout.strip()
    row = json.loads(stdout)
    assert row["status"] == "PASS_EXACT_FAST_CHUNK"
    assert row["root"] == args.root
    assert row["start"] == 0 and row["stop"] == expected_count
    assert row["processed"] == expected_count and row["universe"] == expected_count
    assert row["negative0"] == 0 and row["negative1"] == 0
    assert int(row["minimum0"]) > 0 and int(row["minimum1"]) > 0
    payload = {
        "schema": "rank8-delta01-e3-cubic-all-short-fast-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_FINITE_BAND_FAST",
        "root_location_orbit": args.root,
        "claim": "Every all-short rooted pattern in this root orbit of order n>=37 has Delta0>0 and Delta1>0.",
        "result": row,
        "checked_arithmetic": "every i128 addition, subtraction, and multiplication uses checked operations; compiled with overflow checks enabled",
        "canonical_universe": {
            "expected_cells": expected_count,
            "universe_audit": "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json",
            "universe_audit_sha256": EXPECTED["rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json"],
        },
        "compiler": compiler,
        "executable_sha256": executable_hash,
        "stdout_sha256": hashlib.sha256((stdout + "\n").encode("utf-8")).hexdigest().upper(),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This closes one all-short root orbit only; mixed cells and other root orbits remain separately gated.",
    }
    output = ROOT / f"rank8_delta01_e3_cubic_all_short_{args.root}_fast_exact_agent_20260823.json"
    atomic_json(output, payload)
    print(payload["status"])
    print("RESULT", row)
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()
