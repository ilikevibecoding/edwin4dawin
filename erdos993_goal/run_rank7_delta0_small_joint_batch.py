#!/usr/bin/env python3
"""Certify the cutoff-25 Delta0 small-J upper endpoint by exact order splits."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank7_terminal_broom_delta012_small_joint.py"


def run(cutoff: int, job: tuple[int, str, str]) -> dict:
    m, bound, region = job
    label = f"m{m}_{bound}_{region}"
    log = ROOT / f"rank7_delta0_small_joint_cutoff{cutoff}_{label}_20260820.log"
    result = subprocess.run(
        [sys.executable, "-u", str(PROBE), "--cutoff", str(cutoff),
         "--rank", "0", "--m", str(m), "--q", "0",
         "--b-bound", bound, "--a-region", region],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    log.write_text(result.stdout, encoding="utf-8")
    marker = f"PASS_DELTA012_SMALL_JOINT {cutoff} 0 {m} 0 {bound} {region}"
    passed = result.returncode == 0 and marker in result.stdout
    return {
        "m": m, "b_bound": bound, "a_region": region,
        "status": "PASS" if passed else "INCONCLUSIVE",
        "returncode": result.returncode,
        "log": log.name,
        "sha256": hashlib.sha256(log.read_bytes()).hexdigest(),
        "final_lines": [line for line in result.stdout.splitlines() if line.strip()][-5:],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    parser.add_argument("--workers", type=int, choices=(1, 2), default=2)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    jobs = [(m, "zero", "all") for m in range(5)]
    jobs += [(m, "zero", "low") for m in range(5, 18)]
    jobs += [(m, "badset", "high") for m in range(5, 18)]
    records = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(run, args.cutoff, job): job for job in jobs}
        for future in as_completed(futures):
            record = future.result()
            records.append(record)
            print(record["status"], record["m"], record["b_bound"], record["a_region"], flush=True)
    records.sort(key=lambda r: (r["m"], r["a_region"], r["b_bound"]))
    passed = sum(r["status"] == "PASS" for r in records)
    report = {
        "schema": "rank7-delta0-small-joint-cutoff-v1",
        "status": "PASS" if passed == len(records) else "INCOMPLETE",
        "cutoff": args.cutoff,
        "branch_count": len(records),
        "passed": passed,
        "branches": records,
        "probe_sha256": hashlib.sha256(PROBE.read_bytes()).hexdigest(),
        "small_forest_ratio_report_sha256": hashlib.sha256(
            (ROOT / "forest_rank45_small_orders_exact_20260820.json").read_bytes()
        ).hexdigest(),
    }
    output = ROOT / args.output
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("DELTA0_SMALL_JOINT_BATCH", report["status"], passed, len(records), output.name)
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
