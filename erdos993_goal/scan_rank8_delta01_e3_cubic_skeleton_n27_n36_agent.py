#!/usr/bin/env python3
"""Checkpointed exact all-root census of the e=3 cubic skeleton, n=27..36."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "verify_rank8_delta01_e3_cubic_skeleton_order_agent.rs"
EXECUTABLE = ROOT / "verify_rank8_delta01_e3_cubic_skeleton_order_agent.exe"
CHECKPOINT = ROOT / "rank8_delta01_e3_cubic_skeleton_n27_n36_checkpoint_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json"
EXPECTED_SOURCE = "8C964E7AC0A760702AFED818481B8560EDCAAC865C9A81239FB0750772EBEA12"
EXPECTED_TREES = {
    27: 28448,
    28: 36617,
    29: 46627,
    30: 58842,
    31: 73584,
    32: 91308,
    33: 112420,
    34: 137480,
    35: 166992,
    36: 201636,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def checkpoint_payload(rows: dict[str, dict], compiler: str, executable_hash: str) -> dict:
    return {
        "schema": "rank8-delta01-e3-cubic-skeleton-n27-n36-checkpoint-agent-v1",
        "status": "IN_PROGRESS_EXACT_ORDER_CHECKPOINT",
        "source_sha256": EXPECTED_SOURCE,
        "wrapper_sha256": sha256(Path(__file__)),
        "compiler": compiler,
        "executable_sha256": executable_hash,
        "completed_orders": rows,
    }


def load_checkpoint(compiler: str, executable_hash: str) -> dict[str, dict]:
    if not CHECKPOINT.exists():
        return {}
    payload = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    assert payload["schema"] == "rank8-delta01-e3-cubic-skeleton-n27-n36-checkpoint-agent-v1"
    assert payload["source_sha256"] == EXPECTED_SOURCE
    assert payload["wrapper_sha256"] == sha256(Path(__file__))
    assert payload["compiler"] == compiler
    assert payload["executable_sha256"] == executable_hash
    assert set(map(int, payload["completed_orders"])) <= set(EXPECTED_TREES)
    return payload["completed_orders"]


def run_order(order: int) -> dict:
    started = time.perf_counter()
    replay = subprocess.run(
        [str(EXECUTABLE), str(order)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    lines = [line for line in replay.stdout.splitlines() if line]
    assert len(lines) == 2, replay.stdout
    row = json.loads(lines[0])
    assert lines[1] == f"PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ORDER_{order}"
    assert row["order"] == order
    assert row["trees"] == EXPECTED_TREES[order]
    assert row["roots"] == order * row["trees"]
    assert row["negative0"] == 0 and row["negative1"] == 0
    assert int(row["minimum0"]) > 0 and int(row["minimum1"]) > 0
    row["runtime_seconds"] = time.perf_counter() - started
    row["stdout_sha256"] = hashlib.sha256(replay.stdout.encode("utf-8")).hexdigest().upper()
    return row


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new-orders", type=int)
    args = parser.parse_args()
    assert args.max_new_orders is None or args.max_new_orders >= 0
    assert sha256(SOURCE) == EXPECTED_SOURCE
    compiler = subprocess.run(
        ["rustup", "run", "stable-x86_64-pc-windows-gnu", "rustc", "--version"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    ).stdout.strip()
    subprocess.run(
        [
            "rustup", "run", "stable-x86_64-pc-windows-gnu", "rustc", "-O",
            str(SOURCE), "-o", str(EXECUTABLE),
        ],
        cwd=ROOT,
        check=True,
    )
    executable_hash = sha256(EXECUTABLE)
    rows = load_checkpoint(compiler, executable_hash)
    new_orders = 0
    for order in EXPECTED_TREES:
        if str(order) in rows:
            continue
        if args.max_new_orders is not None and new_orders >= args.max_new_orders:
            break
        row = run_order(order)
        rows[str(order)] = row
        new_orders += 1
        atomic_json(CHECKPOINT, checkpoint_payload(rows, compiler, executable_hash))
        print(
            "ORDER_PASS", order, row["trees"], row["roots"],
            row["minimum0"], row["minimum1"],
            f"{row['runtime_seconds']:.3f}s", flush=True,
        )

    atomic_json(CHECKPOINT, checkpoint_payload(rows, compiler, executable_hash))
    if len(rows) != len(EXPECTED_TREES):
        print("CHECKPOINTED", len(rows), len(EXPECTED_TREES), sha256(CHECKPOINT))
        return
    ordered = [rows[str(order)] for order in EXPECTED_TREES]
    minima = {
        str(rank): min(int(row[f"minimum{rank}"]) for row in ordered)
        for rank in (0, 1)
    }
    witnesses = {}
    for rank in (0, 1):
        row = min(ordered, key=lambda value: int(value[f"minimum{rank}"]))
        witnesses[str(rank)] = {
            "order": row["order"],
            "value": row[f"minimum{rank}"],
            **row[f"witness{rank}"],
        }
    payload = {
        "schema": "rank8-delta01-e3-cubic-skeleton-n27-n36-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36",
        "theorem": (
            "Delta0>0 and Delta1>0 for every root of every subdivision of the "
            "five-leaf three-degree-three-vertex skeleton of orders 27 through 36."
        ),
        "classification": (
            "After suppressing degree-two vertices, the three degree-three vertices "
            "form a path; its outer vertices each carry two leaves and its middle "
            "vertex carries one leaf. Seven positive edge lengths, modulo two leaf-pair "
            "swaps and left-right reflection, are a no-gap isomorphism list."
        ),
        "orders": ordered,
        "totals": {
            "canonical_cores": sum(row["trees"] for row in ordered),
            "rooted_rows": sum(row["roots"] for row in ordered),
            "negative_Delta0": 0,
            "negative_Delta1": 0,
        },
        "global_minimum_values": minima,
        "global_minimum_witnesses": witnesses,
        "engine": {
            "language": "Rust checked i128",
            "compiler": compiler,
            "source_sha256": EXPECTED_SOURCE,
            "executable_sha256": executable_hash,
            "overflow_policy": "every addition, subtraction, and multiplication is checked",
        },
        "wrapper_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is an exact finite theorem, not an all-order cubic-skeleton, "
            "complete Delta0/Delta1, connected-Q8, or Problem-993 theorem."
        ),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("TOTALS", payload["totals"])
    print("WRAPPER", payload["wrapper_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
