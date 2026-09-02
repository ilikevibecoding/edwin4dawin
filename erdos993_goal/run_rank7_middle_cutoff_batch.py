#!/usr/bin/env python3
"""Bounded parallel inventory of rank-seven middle corners at a new cutoff."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import itertools
import json
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
PROBE = HERE / "probe_rank7_terminal_broom_middle_cutoff.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def run(cutoff: int, rank: int, bits: tuple[int, int, int, int]) -> dict:
    suffix = "".join(map(str, bits))
    log = HERE / f"rank7_middle_cutoff{cutoff}_r{rank}_{suffix}.log"
    command = [
        sys.executable, "-u", str(PROBE), "--cutoff", str(cutoff),
        "--rank", str(rank), "--v", str(bits[0]), "--z", str(bits[1]),
        "--s", str(bits[2]), "--d", str(bits[3]),
    ]
    result = subprocess.run(command, cwd=HERE, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, check=False)
    log.write_text(result.stdout, encoding="utf-8")
    passed = result.returncode == 0 and "PASS_ENDPOINT_CUTOFF" in result.stdout
    print("PASS" if passed else "NO_GO", cutoff, rank, suffix, flush=True)
    return {
        "cutoff": cutoff,
        "rank": rank,
        "bits_vzsd": list(bits),
        "status": "PASS" if passed else "BERNSTEIN_NO_GO",
        "returncode": result.returncode,
        "log": log.name,
        "sha256": sha256(log),
        "tail": [line for line in result.stdout.splitlines() if line.strip()][-4:],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, default=25)
    parser.add_argument("--ranks", type=int, nargs="+", default=[4, 5, 6])
    parser.add_argument("--workers", type=int, choices=(1, 2, 3), default=2)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    jobs = [
        (args.cutoff, rank, bits)
        for rank in args.ranks
        for bits in itertools.product((0, 1), repeat=4)
    ]
    records = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(run, *job) for job in jobs]
        for future in as_completed(futures):
            records.append(future.result())
    records.sort(key=lambda row: (row["rank"], row["bits_vzsd"]))
    failures = [row for row in records if row["status"] != "PASS"]
    payload = {
        "status": "PASS_ALL_ENDPOINTS" if not failures else "EXACT_ENDPOINT_INVENTORY_WITH_NO_GOS",
        "cutoff": args.cutoff,
        "ranks": args.ranks,
        "workers": args.workers,
        "branches": records,
        "failures": failures,
        "probe_sha256": sha256(PROBE),
    }
    Path(args.output).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"], "failures", len(failures))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
