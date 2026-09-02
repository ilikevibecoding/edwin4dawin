#!/usr/bin/env python3
"""Primary exact Delta0..6 scans for every rooted core at orders 25 and 26."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "verify_rank7_terminal_broom_delta0_6_order.exe"
SOURCE = ROOT / "verify_rank7_terminal_broom_delta0_6_order.rs"
BASE = ROOT / "verify_rank7_terminal_broom_finite.rs"
ORDERS = {25: 104_636_890, 26: 279_793_450}
OUTPUT = ROOT / "rank7_terminal_broom_delta0_6_n25_n26_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    rows = []
    for order, expected in ORDERS.items():
        log = ROOT / f"rank7_terminal_broom_delta0_6_n{order}_exact_20260820.log"
        completed = subprocess.run(
            [str(EXE), str(order), str(expected)],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        log.write_bytes(completed.stdout)
        decoded = completed.stdout.decode("utf-8")
        marker = f"PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA0_6_ALL_ROOTED_CORES_N{order}"
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
    payload["status"] = "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA0_6_N25_N26"
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"], sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
