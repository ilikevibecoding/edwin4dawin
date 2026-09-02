#!/usr/bin/env python3
"""Launch each D=40 exact-F replay audit as its atomic primary appears."""

from __future__ import annotations

import hashlib
import subprocess
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
SHARDS = ((25, 26), (27, 28), (29, 30), (31, 32),
          (33, 34), (35, 36), (37, 38), (39, 39))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    running: dict[tuple[int, int], tuple[subprocess.Popen[bytes], object, object]] = {}
    completed: set[tuple[int, int]] = set()
    while len(completed) < len(SHARDS):
        for first, last in SHARDS:
            shard = (first, last)
            if shard in running or shard in completed:
                continue
            tag = f"{first}_{last}"
            primary = HERE / (
                "rank8_delta1_new_leaf_mask3_order40_exact_F_"
                f"{tag}_delta1d40_20260825.json"
            )
            if not primary.exists():
                continue
            output = HERE / (
                "rank8_delta1_new_leaf_mask3_order40_exact_F_"
                f"{tag}_independent_audit_delta1d40_20260825.json"
            )
            stdout = (HERE / f"_delta1d40_audit_{tag}.out").open("wb")
            stderr = (HERE / f"_delta1d40_audit_{tag}.err").open("wb")
            command = [
                "python",
                str(HERE / "audit_rank8_delta1_new_leaf_mask3_order40_exact_F_shard_delta1d40.py"),
                "--primary", str(primary),
                "--expected-primary-sha256", sha256(primary),
                "--output", str(output),
            ]
            process = subprocess.Popen(
                command, cwd=HERE, stdout=stdout, stderr=stderr,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            running[shard] = (process, stdout, stderr)
            print("AUDIT_STARTED", tag, process.pid, flush=True)

        for shard, (process, stdout, stderr) in list(running.items()):
            code = process.poll()
            if code is None:
                continue
            stdout.close()
            stderr.close()
            assert code == 0, (shard, code)
            first, last = shard
            output = HERE / (
                "rank8_delta1_new_leaf_mask3_order40_exact_F_"
                f"{first}_{last}_independent_audit_delta1d40_20260825.json"
            )
            assert output.exists()
            completed.add(shard)
            del running[shard]
            print("AUDIT_DONE", first, last, sha256(output), flush=True)
        time.sleep(5)
    print("ALL_D40_EXACT_AUDITS_DONE", flush=True)


if __name__ == "__main__":
    main()




