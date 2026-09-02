#!/usr/bin/env python3
"""Launch D=38 independent exact-F audits as primary shards appear."""

from __future__ import annotations

import hashlib
import subprocess
import sys
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
SHARDS = ((23, 24), (25, 26), (27, 28), (29, 30), (31, 32), (33, 34), (35, 36), (37, 37))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    running: dict[tuple[int, int], tuple[subprocess.Popen[bytes], object, object]] = {}
    completed: set[tuple[int, int]] = set()
    while len(completed) < len(SHARDS):
        for shard in SHARDS:
            if shard in running or shard in completed:
                continue
            first, last = shard
            primary = HERE / (
                "rank8_delta1_new_leaf_mask3_order38_exact_F_"
                f"{first}_{last}_delta1d38_20260825.json"
            )
            if not primary.exists():
                continue
            output = HERE / (
                "rank8_delta1_new_leaf_mask3_order38_exact_F_"
                f"{first}_{last}_independent_audit_delta1d38_20260825.json"
            )
            stdout_handle = (HERE / f"_delta1d38_audit_{first}_{last}.out").open("wb")
            stderr_handle = (HERE / f"_delta1d38_audit_{first}_{last}.err").open("wb")
            command = [
                sys.executable,
                str(HERE / "audit_rank8_delta1_new_leaf_mask3_order38_exact_F_shard_delta1d38.py"),
                "--primary", str(primary),
                "--expected-primary-sha256", sha256(primary),
                "--output", str(output),
            ]
            process = subprocess.Popen(
                command,
                cwd=HERE,
                stdout=stdout_handle,
                stderr=stderr_handle,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            running[shard] = (process, stdout_handle, stderr_handle)
            print("AUDIT_STARTED", first, last, process.pid, flush=True)
        for shard, (process, stdout_handle, stderr_handle) in list(running.items()):
            return_code = process.poll()
            if return_code is None:
                continue
            stdout_handle.close()
            stderr_handle.close()
            first, last = shard
            if return_code != 0:
                raise SystemExit(f"audit {first}_{last} failed with {return_code}")
            report = HERE / (
                "rank8_delta1_new_leaf_mask3_order38_exact_F_"
                f"{first}_{last}_independent_audit_delta1d38_20260825.json"
            )
            assert report.exists()
            print("AUDIT_DONE", first, last, sha256(report), flush=True)
            completed.add(shard)
            del running[shard]
        time.sleep(3)
    print("ALL_D38_EXACT_AUDITS_DONE", flush=True)


if __name__ == "__main__":
    main()


