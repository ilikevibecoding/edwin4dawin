#!/usr/bin/env python3
"""Checkpointed exact finite batch for complementary-capacity Delta1/2 cells."""

from __future__ import annotations

import gc
import hashlib
import json
from pathlib import Path

from prove_rank7_delta12_complementary_capacity_fixed import certify


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "rank7_delta12_complementary_capacity_fixed_exact_20260820.json"
RESIDUAL = ROOT / "rank7_rooted_cross_residual_after_b2_4_exact_20260816.json"
SOURCE = ROOT / "prove_rank7_delta12_complementary_capacity_fixed.py"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def key(row: dict) -> str:
    return ":".join(
        str(row[item])
        for item in ("rank", "n", "root_degree", "branch", "q_endpoint")
    )


def write(rows: list[dict], expected: int) -> None:
    report = {
        "schema": "rank7-delta12-complementary-capacity-fixed-v1",
        "status": "PASS" if len(rows) == expected else "IN_PROGRESS",
        "scope": (
            "lower-d complementary-capacity faces in the exact residual "
            "root-degree cells, integer n=25..38"
        ),
        "expected_cells": expected,
        "completed_cells": len(rows),
        "passing_cells": sum(row["status"] == "PASS" for row in rows),
        "source_sha256": sha(SOURCE),
        "runner_sha256": sha(Path(__file__).resolve()),
        "residual_input_sha256": sha(RESIDUAL),
        "cells": rows,
    }
    OUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    residual = json.loads(RESIDUAL.read_text(encoding="utf-8"))["residual"]["cells"]
    pairs = sorted(
        {
            (row["order"], row["root_degree"])
            for row in residual
            if 25 <= row["order"] <= 38
        }
    )
    jobs = []
    for rank in (1, 2):
        for n, root_degree in pairs:
            branches = (
                ("containment", "extension")
                if root_degree <= 4
                else ("extension_mass",)
            )
            for branch in branches:
                for q_endpoint in (0, 1):
                    jobs.append((rank, n, root_degree, branch, q_endpoint))
    expected = len(jobs)
    rows = []
    if OUT.exists():
        previous = json.loads(OUT.read_text(encoding="utf-8"))
        if previous.get("source_sha256") == sha(SOURCE):
            rows = previous.get("cells", [])
    done = {key(row) for row in rows}
    print("expected", expected, "resuming", len(rows), flush=True)
    for job in jobs:
        rank, n, root_degree, branch, q_endpoint = job
        identity = f"{rank}:{n}:{root_degree}:{branch}:{q_endpoint}"
        if identity in done:
            continue
        result = certify(rank, n, root_degree, branch, q_endpoint)
        rows.append(result)
        done.add(identity)
        write(rows, expected)
        print("PASS", len(rows), "/", expected, identity, flush=True)
        gc.collect()
    assert len(rows) == expected
    assert all(row["status"] == "PASS" for row in rows)
    write(rows, expected)
    print("PASS_EXACT_RANK7_DELTA12_COMPLEMENTARY_CAPACITY_FIXED_BATCH")
    print("report", OUT.name, sha(OUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
