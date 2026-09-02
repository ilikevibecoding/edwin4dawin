#!/usr/bin/env python3
"""Inventory every Delta0--Delta2 cutoff Bernstein branch exactly."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank7_terminal_broom_delta012_cutoff.py"


def run(cutoff: int, job: tuple[int, str, int, int]) -> dict:
    rank, case, q, d = job
    log = ROOT / f"rank7_delta{rank}_cutoff{cutoff}_{case}_{q}_{d}_20260820.log"
    result = subprocess.run(
        [
            sys.executable,
            "-u",
            str(PROBE),
            "--cutoff",
            str(cutoff),
            "--rank",
            str(rank),
            "--case",
            case,
            "--q",
            str(q),
            "--d",
            str(d),
        ],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    log.write_text(result.stdout, encoding="utf-8")
    marker = f"PASS_DELTA012_CUTOFF_PROBE {cutoff} {rank} {case} {q} {d}"
    passed = result.returncode == 0 and marker in result.stdout
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    return {
        "rank": rank,
        "case": case,
        "q_endpoint": q,
        "d_endpoint": d,
        "status": "PASS" if passed else "INCONCLUSIVE",
        "returncode": result.returncode,
        "log": log.name,
        "sha256": hashlib.sha256(log.read_bytes()).hexdigest(),
        "final_lines": lines[-5:],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    parser.add_argument("--workers", type=int, choices=(1, 2), default=2)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    jobs = [
        (rank, case, q, d)
        for rank in (0, 1, 2)
        for case in ("small", "large")
        for q in (0, 1)
        for d in (0, 1)
    ]
    records = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(run, args.cutoff, job): job for job in jobs}
        for future in as_completed(futures):
            record = future.result()
            records.append(record)
            print(
                record["status"],
                record["rank"],
                record["case"],
                record["q_endpoint"],
                record["d_endpoint"],
                flush=True,
            )
    records.sort(key=lambda r: (r["rank"], r["case"], r["q_endpoint"], r["d_endpoint"]))
    passed = sum(r["status"] == "PASS" for r in records)
    report = {
        "schema": "rank7-terminal-broom-delta012-cutoff-inventory-v1",
        "status": "PASS" if passed == len(records) else "INCOMPLETE",
        "cutoff": args.cutoff,
        "branch_count": len(records),
        "passed": passed,
        "branches": records,
        "probe_sha256": hashlib.sha256(PROBE.read_bytes()).hexdigest(),
        "source_sha256": hashlib.sha256(
            (ROOT / "prove_rank7_terminal_broom_delta0_large.py").read_bytes()
        ).hexdigest(),
    }
    output = ROOT / args.output
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("DELTA012_CUTOFF_INVENTORY", report["status"], passed, len(records), output.name)
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
