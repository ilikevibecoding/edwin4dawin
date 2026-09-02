#!/usr/bin/env python3
"""Run and seal the complete six-thread order-27 all-root Delta0..Delta3 census."""

from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "verify_rank8_terminal_delta03_finite_wrom_threaded_root.exe"
EQUIVALENCE = ROOT / "rank8_terminal_delta03_finite_wrom_threaded_equivalence_root_20260823.json"
OUTPUT = ROOT / "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json"
ORDER = 27
THREADS = 6
TREES = 751_065_460
ROOTS = TREES * ORDER

EXPECTED = {
    "verify_rank8_terminal_delta03_finite_wrom_threaded_root.rs":
        "D72084ED90E55501B881179DDA73148D64FCB29431102ADF5674E018380D2F89",
    "verify_rank8_terminal_delta03_finite_wrom_threaded_root.exe":
        "DC711B103514AF1DA5B303C8234F89A06FC61C19A5153D717164BF879AB37C47",
    "verify_rank8_terminal_delta5_finite.rs":
        "2C76D7E7C9312331F799AB252FC806056D0201BE25AFA18446B218515F2EE2D6",
    "audit_rank8_terminal_delta03_finite_wrom_threaded_equivalence_root.py":
        "F74D0637C41B874A53F503C8AD716BAE9CCAFA803CB3B23DD575A2A4E3EBB5A9",
    "rank8_terminal_delta03_finite_wrom_threaded_equivalence_root_20260823.json":
        "C4B6B3134AC23F5D9C1C3E8C2EA16118CC23E30B748274D14BD62718ED8EC29A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    equivalence = json.loads(EQUIVALENCE.read_text(encoding="utf-8"))
    assert equivalence["status"] == "PASS_EXACT_RANK8_DELTA03_THREADED_WROM_SERIAL_EQUIVALENCE_N23"
    assert all(equivalence["comparisons"].values())
    assert not OUTPUT.exists(), f"refusing to overwrite sealed report: {OUTPUT.name}"

    started = time.perf_counter()
    completed = subprocess.run(
        [str(EXE), str(ORDER), str(THREADS)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        timeout=28_800,
    )
    elapsed = time.perf_counter() - started
    assert completed.returncode == 0, completed.stderr
    assert not completed.stderr, completed.stderr
    lines = [line for line in completed.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    scan = json.loads(lines[0])
    assert scan["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA03_FINITE_WROM_THREADED"
    assert scan["order"] == ORDER and scan["threads"] == THREADS
    assert scan["trees"] == TREES
    assert scan["roots"] == scan["active"] == ROOTS
    assert scan["negative_counts"] == [0, 0, 0, 0]
    assert scan["active_minima"] == scan["minima"]
    assert all(int(value) > 0 for value in scan["minima"])

    ranges = scan["worker_ranges"]
    assert len(ranges) == THREADS
    assert ranges[0]["start"] == 0 and ranges[-1]["stop"] == TREES
    assert sum(row["processed"] for row in ranges) == TREES
    assert sum(row["roots"] for row in ranges) == ROOTS
    assert sum(row["active"] for row in ranges) == ROOTS
    for index, row in enumerate(ranges):
        assert row["worker"] == index
        assert row["seen_prefix"] == row["stop"]
        assert row["processed"] == row["stop"] - row["start"]
        assert row["roots"] == row["active"] == row["processed"] * ORDER
        if index:
            assert ranges[index - 1]["stop"] == row["start"]

    payload = {
        "schema": "rank8-terminal-delta03-finite-n27-wrom-threaded-root-v1",
        "status": "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27",
        "scope": {
            "core_order": ORDER,
            "free_trees": TREES,
            "all_rooted_pairs": ROOTS,
            "ranks": [0, 1, 2, 3],
            "claim": "finite exact order-27 census only",
        },
        "acceptance": {
            "active_rooted_pairs": scan["active"],
            "negative_counts": scan["negative_counts"],
            "global_minima": scan["minima"],
            "active_minima": scan["active_minima"],
            "minimum_witnesses": scan["minimum_witnesses"],
        },
        "threaded_coverage": {
            "threads": THREADS,
            "worker_ranges": ranges,
            "adjacent_no_gap_no_overlap": True,
            "exact_A000055_total": TREES,
        },
        "engine_equivalence": {
            "reference_order": 23,
            "report": EQUIVALENCE.name,
            "report_sha256": EXPECTED[EQUIVALENCE.name],
            "status": equivalence["status"],
        },
        "raw_result": scan,
        "runtime_seconds": elapsed,
        "scanner_runtime_seconds": scan["runtime_seconds"],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes only the finite order-27 all-root layer. It does not prove "
            "Delta0..Delta3 for any order at least 28 or close the full rank-eight theorem."
        ),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))
    print("SECONDS", f"{elapsed:.6f}")


if __name__ == "__main__":
    main()
