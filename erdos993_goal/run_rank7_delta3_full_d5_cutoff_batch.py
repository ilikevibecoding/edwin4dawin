#!/usr/bin/env python3
"""Run all eight exact Delta3 full-D5 cutoff branches."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank7_terminal_broom_delta3_full_d5_cutoff.py"


def run(cutoff: int, endpoint: tuple[int, int, int]) -> dict:
    z, s, d = endpoint
    bits = f"{z}{s}{d}"
    log = ROOT / f"rank7_delta3_full_d5_cutoff{cutoff}_{bits}_20260820.log"
    result = subprocess.run(
        [sys.executable, "-u", str(PROBE), "--cutoff", str(cutoff),
         "--z", str(z), "--s", str(s), "--d", str(d)],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    log.write_text(result.stdout, encoding="utf-8")
    marker = f"PASS_DELTA3_FULL_D5_CUTOFF {cutoff} {z} {s} {d}"
    passed = result.returncode == 0 and marker in result.stdout
    return {
        "z": z, "s": s, "d": d,
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
    endpoints = [(z, s, d) for z in (0, 1) for s in (0, 1) for d in (0, 1)]
    records = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(run, args.cutoff, ep): ep for ep in endpoints}
        for future in as_completed(futures):
            record = future.result()
            records.append(record)
            print(record["status"], record["z"], record["s"], record["d"], flush=True)
    records.sort(key=lambda r: (r["z"], r["s"], r["d"]))
    passed = sum(r["status"] == "PASS" for r in records)
    report = {
        "schema": "rank7-delta3-full-d5-cutoff-v1",
        "status": "PASS" if passed == 8 else "INCOMPLETE",
        "cutoff": args.cutoff,
        "passed": passed,
        "branches": records,
        "probe_sha256": hashlib.sha256(PROBE.read_bytes()).hexdigest(),
    }
    output = ROOT / args.output
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("DELTA3_FULL_D5_CUTOFF_BATCH", report["status"], passed, output.name)
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
