#!/usr/bin/env python3
"""Memory-bounded batch runner for the full-D4 middle-difference corners."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank7_terminal_broom_middle_endpoints.py"


def branch_log(rank: int, bits: tuple[int, int, int, int]) -> Path:
    suffix = "".join(map(str, bits))
    return ROOT / f"rank7_middle_d4_bernstein_r{rank}_{suffix}.log"


def run_branch(rank: int, bits: tuple[int, int, int, int]) -> dict:
    log = branch_log(rank, bits)
    if log.exists() and "PASS_ENDPOINT" in log.read_text(encoding="utf-8"):
        output = log.read_text(encoding="utf-8")
        status = "cached-pass"
    else:
        v, z, s, d = bits
        command = [
            sys.executable,
            "-u",
            str(PROBE),
            "--rank",
            str(rank),
            "--u",
            "2",
            "--v",
            str(v),
            "--z",
            str(z),
            "--s",
            str(s),
            "--d",
            str(d),
        ]
        result = subprocess.run(
            command,
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        output = result.stdout
        log.write_text(output, encoding="utf-8")
        if result.returncode != 0 or "PASS_ENDPOINT" not in output:
            raise RuntimeError(
                f"rank {rank} branch {bits} failed with {result.returncode}:\n{output}"
            )
        status = "pass"
    digest = hashlib.sha256(log.read_bytes()).hexdigest()
    final_lines = [line for line in output.splitlines() if line.strip()][-3:]
    return {
        "rank": rank,
        "bits_vzsd": list(bits),
        "status": status,
        "log": log.name,
        "sha256": digest,
        "final_lines": final_lines,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ranks", type=int, nargs="+", default=[3, 4, 5, 6])
    parser.add_argument("--workers", type=int, default=2, choices=(1, 2))
    args = parser.parse_args()
    jobs = [
        (rank, (v, z, s, d))
        for rank in args.ranks
        for v in (0, 1)
        for z in (0, 1)
        for s in (0, 1)
        for d in (0, 1)
    ]
    records = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(run_branch, *job): job for job in jobs}
        for future in as_completed(futures):
            record = future.result()
            records.append(record)
            print(
                "PASS",
                record["rank"],
                "".join(map(str, record["bits_vzsd"])),
                record["status"],
                flush=True,
            )
    records.sort(key=lambda item: (item["rank"], item["bits_vzsd"]))
    ranks_label = "_".join(map(str, sorted(set(args.ranks))))
    manifest = ROOT / f"rank7_middle_d4_bernstein_ranks_{ranks_label}.json"
    manifest.write_text(
        json.dumps(
            {
                "schema": "rank7-middle-d4-bernstein-v1",
                "workers": args.workers,
                "branches": records,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    print("BATCH_PASS", len(records), manifest.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
