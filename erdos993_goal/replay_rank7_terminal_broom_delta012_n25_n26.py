#!/usr/bin/env python3
"""Fresh replay and byte-for-byte audit of the rank-7 n=25,26 Delta0..2 scans."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "verify_rank7_terminal_broom_delta012_order.exe"
SOURCE = ROOT / "verify_rank7_terminal_broom_delta012_order.rs"
BASE = ROOT / "verify_rank7_terminal_broom_finite.rs"
ORDERS = {25: 104_636_890, 26: 279_793_450}
OUTPUT = ROOT / "rank7_terminal_broom_delta012_n25_n26_replay_exact_20260820.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    results = []
    for order, expected in ORDERS.items():
        primary = ROOT / f"rank7_terminal_broom_delta012_n{order}_exact_20260820.log"
        replay = ROOT / f"rank7_terminal_broom_delta012_n{order}_fresh_replay_20260820.log"
        assert primary.is_file() and primary.stat().st_size > 0
        completed = subprocess.run(
            [str(EXE), str(order), str(expected)],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        replay.write_bytes(completed.stdout)
        marker = f"PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_ALL_ROOTED_CORES_N{order}"
        decoded = completed.stdout.decode("utf-8")
        assert completed.returncode == 0 and marker in decoded
        assert replay.read_bytes() == primary.read_bytes()
        results.append(
            {
                "order": order,
                "expected_free_trees": expected,
                "expected_roots": expected * order,
                "primary_log": primary.name,
                "primary_sha256": sha(primary),
                "replay_log": replay.name,
                "replay_sha256": sha(replay),
                "byte_identical": True,
            }
        )
    report = {
        "status": "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_N25_N26_FRESH_REPLAY",
        "orders": results,
        "source_sha256": sha(SOURCE),
        "base_source_sha256": sha(BASE),
        "executable_sha256": sha(EXE),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    for row in results:
        print(row["order"], row["expected_free_trees"], row["expected_roots"], row["primary_sha256"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
