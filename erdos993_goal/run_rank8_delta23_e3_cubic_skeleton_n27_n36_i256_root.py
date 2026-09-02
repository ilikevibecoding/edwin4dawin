#!/usr/bin/env python3
"""Checkpoint, run, and seal the finite cubic Delta2/Delta3 orders 27..36."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "verify_rank8_delta23_e3_cubic_skeleton_order_i256_root.exe"
CHECKPOINT = ROOT / "rank8_delta23_e3_cubic_skeleton_n27_n36_i256_checkpoint_root_20260823.json"
REPORT = ROOT / "rank8_delta23_e3_cubic_skeleton_n27_n36_exact_root_20260823.json"
EXPECTED_TREES = {
    27: 28_448,
    28: 36_617,
    29: 46_627,
    30: 58_842,
    31: 73_584,
    32: 91_308,
    33: 112_420,
    34: 137_480,
    35: 166_992,
    36: 201_636,
}
EXPECTED = {
    "verify_rank8_delta23_e3_cubic_skeleton_order_i256_root.rs": "85341DD4AC11551EBBC55A5F707A9369B25CD0B33424EBDCB5B786D18DBF2DC7",
    "verify_rank8_delta23_e3_cubic_skeleton_order_i256_root.exe": "97F3CE2B556418334F5751D83BDBB31C03B1334EA4DED369EF286E66421733FD",
    "verify_rank8_delta01_e3_cubic_skeleton_order_agent.rs": "8C964E7AC0A760702AFED818481B8560EDCAAC865C9A81239FB0750772EBEA12",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json": "42DDF19A1AFB20C46C59B126F7D5D3614060F11AEB04C77E4E22D4CDB9CF03E4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def validate(order: int, row: dict) -> None:
    assert row["order"] == order
    assert row["trees"] == EXPECTED_TREES[order]
    assert row["roots"] == order * row["trees"]
    assert row["negative2"] == row["negative3"] == 0
    assert int(row["minimum2"]) > 0 and int(row["minimum3"]) > 0


def checkpoint(rows: dict[str, dict], actual: dict, source_hash: str) -> dict:
    return {
        "schema": "rank8-delta23-e3-cubic-skeleton-n27-n36-i256-checkpoint-root-v1",
        "status": "RUNNING_EXACT_DELTA23_E3_CUBIC_SKELETON_N27_N36",
        "completed_orders": rows,
        "immutable_inputs": actual,
        "source_sha256": source_hash,
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    source_hash = sha256(Path(__file__))
    rows: dict[str, dict] = {}
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["immutable_inputs"] == actual and saved["source_sha256"] == source_hash
        rows = saved["completed_orders"]
        for key, row in rows.items(): validate(int(key), row)
    atomic_json(CHECKPOINT, checkpoint(rows, actual, source_hash))

    for order in EXPECTED_TREES:
        if str(order) in rows:
            continue
        started = time.perf_counter()
        completed = subprocess.run(
            [str(EXE), str(order)], cwd=ROOT, check=True,
            capture_output=True, text=True, timeout=14_400,
        )
        assert not completed.stderr, completed.stderr
        lines = [line for line in completed.stdout.splitlines() if line.strip()]
        assert len(lines) == 2
        assert lines[1] == f"PASS_EXACT_RANK8_DELTA23_E3_CUBIC_SKELETON_ORDER_{order}"
        row = json.loads(lines[0])
        validate(order, row)
        row["runtime_seconds"] = time.perf_counter() - started
        row["stdout_sha256"] = hashlib.sha256(completed.stdout.encode("utf-8")).hexdigest().upper()
        rows[str(order)] = row
        atomic_json(CHECKPOINT, checkpoint(rows, actual, source_hash))
        print("PASS", order, row["trees"], row["roots"], f"{row['runtime_seconds']:.3f}s", flush=True)

    ordered = [rows[str(order)] for order in EXPECTED_TREES]
    minima = {
        str(rank): min(int(row[f"minimum{rank}"]) for row in ordered)
        for rank in (2, 3)
    }
    witnesses = {}
    for rank in (2, 3):
        row = min(ordered, key=lambda item: int(item[f"minimum{rank}"]))
        witnesses[str(rank)] = {
            "order": row["order"],
            "value": row[f"minimum{rank}"],
            **row[f"witness{rank}"],
        }
    payload = {
        "schema": "rank8-delta23-e3-cubic-skeleton-n27-n36-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36",
        "theorem": "Delta2>0 and Delta3>0 for every root of every subdivision of the five-leaf cubic e=3 skeleton of orders 27 through 36.",
        "orders": ordered,
        "totals": {
            "canonical_cores": sum(row["trees"] for row in ordered),
            "rooted_rows": sum(row["roots"] for row in ordered),
            "negative_or_zero_Delta2": 0,
            "negative_or_zero_Delta3": 0,
        },
        "global_minimum_values": minima,
        "global_minimum_witnesses": witnesses,
        "engine": {
            "literal_tree_dp": True,
            "matching_vectors": "checked i128",
            "residuals_and_differences": "checked signed i256",
            "source_sha256": EXPECTED["verify_rank8_delta23_e3_cubic_skeleton_order_i256_root.rs"],
            "executable_sha256": EXPECTED[EXE.name],
        },
        "immutable_inputs": actual,
        "source_sha256": source_hash,
        "scope_warning": "This closes only finite orders 27..36 for the cubic Delta2/Delta3 skeleton. All-long and mixed n>=37 cells, quartic-star e=3, other connected cases, forest Q8, PGC, and Problem 993 remain separately gated.",
    }
    atomic_json(REPORT, payload)
    complete = checkpoint(rows, actual, source_hash)
    complete["status"] = "COMPLETE_EXACT_DELTA23_E3_CUBIC_SKELETON_N27_N36"
    complete["report_sha256"] = sha256(REPORT)
    atomic_json(CHECKPOINT, complete)
    print(payload["status"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
