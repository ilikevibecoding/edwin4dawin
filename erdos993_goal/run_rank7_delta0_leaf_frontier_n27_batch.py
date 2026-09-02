#!/usr/bin/env python3
"""Checkpointed exact batch for every order-27 Delta0 leaf-frontier cell."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import subprocess
import sys

from verify_rank7_leaf_boundary_frontier_structure import all_rows, frontier


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank7_delta0_leaf_frontier_fixed_m.py"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def key(job):
    beta, boundary_one, m, region = job
    return f"{beta}:{boundary_one}:{m}:{region}"


def run(job):
    beta, boundary_one, m, region = job
    log = ROOT / (
        f"rank7_delta0_leaf_frontier_n27_b{beta}_l{boundary_one}_m{m}_{region}_20260820.log"
    )
    result = subprocess.run(
        [
            sys.executable,
            "-u",
            str(PROBE),
            "--n",
            "27",
            "--m",
            str(m),
            "--b2",
            str(beta),
            "--boundary-one",
            str(boundary_one),
            "--region",
            region,
        ],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    log.write_text(result.stdout, encoding="utf-8")
    marker = (
        f"PASS_DELTA0_LEAF_FRONTIER_FIXED_M 27 {m} {beta} "
        f"{boundary_one} {region}"
    )
    passed = result.returncode == 0 and marker in result.stdout
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    return {
        "key": key(job),
        "B2_lower": beta,
        "boundary_one_upper": boundary_one,
        "m": m,
        "region": region,
        "status": "PASS" if passed else "INCONCLUSIVE",
        "returncode": result.returncode,
        "log": log.name,
        "sha256": sha(log),
        "final_lines": lines[-8:],
    }


def write_checkpoint(path: Path, records, total):
    ordered = sorted(
        records.values(),
        key=lambda row: (
            row["B2_lower"],
            row["boundary_one_upper"],
            row["m"],
            row["region"],
        ),
    )
    passed = sum(row["status"] == "PASS" for row in ordered)
    report = {
        "schema": "rank7-delta0-leaf-frontier-n27-batch-v1",
        "status": "PASS" if passed == total else "RUNNING_OR_INCOMPLETE",
        "order": 27,
        "B2_floor": 6,
        "frontier_rows": 35,
        "large_J_m_values": list(range(18, 26)),
        "regions": ["ratio", "badset"],
        "total_cells": total,
        "completed": len(ordered),
        "passed": passed,
        "probe_sha256": sha(PROBE),
        "structure_report_sha256": sha(
            ROOT / "rank7_delta0_leaf_boundary_frontier_n27_exact_20260820.json"
        ),
        "cells": ordered,
    }
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, choices=(1, 2), default=2)
    parser.add_argument(
        "--output",
        default="rank7_delta0_leaf_frontier_n27_exact_20260820.json",
    )
    args = parser.parse_args()
    structure_rows, _ = all_rows(27, 6)
    boundary = frontier(structure_rows)
    assert len(boundary) == 35
    jobs = [
        (beta, boundary_one, m, region)
        for beta, boundary_one in boundary
        for m in range(18, 26)
        for region in ("ratio", "badset")
    ]
    assert len(jobs) == 560
    output = ROOT / args.output
    records = {}
    if output.exists():
        previous = json.loads(output.read_text(encoding="utf-8"))
        if (
            previous.get("schema") == "rank7-delta0-leaf-frontier-n27-batch-v1"
            and previous.get("probe_sha256") == sha(PROBE)
        ):
            for row in previous.get("cells", []):
                log = ROOT / row["log"]
                if row["status"] == "PASS" and log.exists() and sha(log) == row["sha256"]:
                    records[row["key"]] = row
    pending = [job for job in jobs if key(job) not in records]
    print("resume", len(records), "pending", len(pending), "total", len(jobs), flush=True)
    failed = False
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(run, job): job for job in pending}
        for future in as_completed(futures):
            row = future.result()
            records[row["key"]] = row
            report = write_checkpoint(output, records, len(jobs))
            print(
                row["status"],
                row["key"],
                "completed",
                report["completed"],
                "passed",
                report["passed"],
                flush=True,
            )
            if row["status"] != "PASS":
                failed = True
    report = write_checkpoint(output, records, len(jobs))
    print(
        "DELTA0_LEAF_FRONTIER_N27_BATCH",
        report["status"],
        report["passed"],
        report["total_cells"],
        output.name,
    )
    return 0 if report["status"] == "PASS" and not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
