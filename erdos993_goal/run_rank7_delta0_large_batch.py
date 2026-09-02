#!/usr/bin/env python3
"""Run and hash all eight exact Delta^0 large-order Bernstein branches."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
PROVER = ROOT / "prove_rank7_terminal_broom_delta0_large.py"


def run(job: tuple[str, int, int]) -> dict:
    case, q, d = job
    log = ROOT / f"rank7_terminal_broom_delta0_{case}_{q}_{d}.log"
    if (
        log.exists()
        and "PASS_DELTA0_BRANCH" in log.read_text(encoding="utf-8")
        and "capacity_c5_lower C(n-4,5)" in log.read_text(encoding="utf-8")
    ):
        output = log.read_text(encoding="utf-8")
        status = "cached-pass"
    else:
        result = subprocess.run(
            [
                sys.executable,
                "-u",
                str(PROVER),
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
        output = result.stdout
        log.write_text(output, encoding="utf-8")
        if result.returncode != 0 or "PASS_DELTA0_BRANCH" not in output:
            raise RuntimeError(f"failed {job}:\n{output}")
        status = "pass"
    return {
        "case": case,
        "q_endpoint": q,
        "d_endpoint": d,
        "status": status,
        "log": log.name,
        "sha256": hashlib.sha256(log.read_bytes()).hexdigest(),
        "final_lines": [line for line in output.splitlines() if line.strip()][-3:],
    }


def main() -> int:
    jobs = [(case, q, d) for case in ("small", "large") for q in (0, 1) for d in (0, 1)]
    records = []
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(run, job): job for job in jobs}
        for future in as_completed(futures):
            record = future.result()
            records.append(record)
            print("PASS", record["case"], record["q_endpoint"], record["d_endpoint"], flush=True)
    records.sort(key=lambda item: (item["case"], item["q_endpoint"], item["d_endpoint"]))
    manifest = ROOT / "rank7_terminal_broom_delta0_large_exact_20260816.json"
    manifest.write_text(
        json.dumps({"schema": "rank7-terminal-broom-delta0-v1", "branches": records}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print("DELTA0_LARGE_BATCH_PASS", len(records), manifest.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
