#!/usr/bin/env python3
"""Exact primary scans of Delta0..2 for every rooted core at orders 23 and 24."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "verify_rank7_terminal_broom_delta012_order.exe"
SOURCE = ROOT / "verify_rank7_terminal_broom_delta012_order.rs"
BASE = ROOT / "verify_rank7_terminal_broom_finite.rs"
ORDERS = {23: 14_828_074, 24: 39_299_897}
OUTPUT = ROOT / "rank7_terminal_broom_delta012_n23_n24_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    rows = []
    for order, expected in ORDERS.items():
        log = ROOT / f"rank7_terminal_broom_delta012_n{order}_exact_20260820.log"
        completed = subprocess.run(
            [str(EXE), str(order), str(expected)],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        log.write_bytes(completed.stdout)
        decoded = completed.stdout.decode("utf-8")
        marker = f"PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_ALL_ROOTED_CORES_N{order}"
        if completed.returncode != 0 or marker not in decoded:
            print(decoded, flush=True)
            return 2
        rows.append(
            {
                "order": order,
                "expected_free_trees": expected,
                "expected_roots": expected * order,
                "log": log.name,
                "log_sha256": sha256(log),
            }
        )
        payload = {
            "status": "RUNNING",
            "orders": rows,
            "source_sha256": sha256(SOURCE),
            "base_source_sha256": sha256(BASE),
            "executable_sha256": sha256(EXE),
        }
        OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print("checkpoint", order, expected, expected * order, flush=True)
    payload["status"] = "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_N23_N24"
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"], sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
