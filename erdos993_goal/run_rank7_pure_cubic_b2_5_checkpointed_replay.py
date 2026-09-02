#!/usr/bin/env python3
"""Durable no-gap replay wrapper for the pure-cubic B2=5 certificate.

Each (n,k) block is run as an independent exact v2 batch.  A block report is
accepted only when the child exits successfully and its JSON says PASS_EXACT.
The manifest is replaced atomically after every accepted block, so an
interrupted replay can resume without rerunning completed blocks.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time


HERE = Path(__file__).resolve().parent
RUNNER = HERE / "run_rank7_pure_cubic_b2_5_bernstein_batch_v2.py"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-first", type=int, default=23)
    parser.add_argument("--n-last", type=int, default=38)
    parser.add_argument("--k-first", type=int, default=-7)
    parser.add_argument("--k-last", type=int, default=4)
    parser.add_argument("--rank-first", type=int, default=0)
    parser.add_argument("--rank-last", type=int, default=6)
    parser.add_argument("--depth", type=int, default=48)
    parser.add_argument("--output-dir", default="pure_cubic_checkpointed_replay")
    args = parser.parse_args()

    output_dir = (HERE / args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("parameters") != vars(args):
            raise SystemExit("refusing to resume: manifest parameters differ")
        if manifest.get("runner_sha256") != sha256(RUNNER):
            raise SystemExit("refusing to resume: exact runner hash differs")
    else:
        manifest = {
            "status": "RUNNING",
            "parameters": vars(args),
            "runner": RUNNER.name,
            "runner_sha256": sha256(RUNNER),
            "completed": [],
            "failure": None,
        }
        atomic_json(manifest_path, manifest)

    completed = {(item["n"], item["k"]) for item in manifest["completed"]}
    for n in range(args.n_first, args.n_last + 1):
        for k in range(args.k_first, args.k_last + 1):
            if (n, k) in completed:
                continue
            report = output_dir / f"n{n}_k{k:+d}.json"
            command = [
                sys.executable,
                str(RUNNER),
                "--n-first", str(n),
                "--n-last", str(n),
                "--k-first", str(k),
                "--k-last", str(k),
                "--rank-first", str(args.rank_first),
                "--rank-last", str(args.rank_last),
                "--depth", str(args.depth),
                "--output", str(report),
            ]
            started = time.time()
            result = subprocess.run(command, cwd=HERE)
            payload = json.loads(report.read_text(encoding="utf-8")) if report.exists() else None
            if result.returncode != 0 or not payload or payload.get("status") != "PASS_EXACT":
                manifest["status"] = "FAILED_OR_UNRESOLVED"
                manifest["failure"] = {
                    "n": n,
                    "k": k,
                    "returncode": result.returncode,
                    "report": report.name if report.exists() else None,
                    "payload": payload,
                }
                atomic_json(manifest_path, manifest)
                return 1
            item = {
                "n": n,
                "k": k,
                "report": report.name,
                "report_sha256": sha256(report),
                "profiles": payload["profiles"],
                "branches": payload["branches"],
                "nodes": payload["nodes"],
                "elapsed_seconds": payload["elapsed_seconds"],
                "wrapper_elapsed_seconds": time.time() - started,
                "status": "PASS_EXACT",
            }
            manifest["completed"].append(item)
            completed.add((n, k))
            atomic_json(manifest_path, manifest)
            print("CHECKPOINT_PASS_EXACT", n, k, flush=True)

    expected = {
        (n, k)
        for n in range(args.n_first, args.n_last + 1)
        for k in range(args.k_first, args.k_last + 1)
    }
    actual = {(item["n"], item["k"]) for item in manifest["completed"]}
    if actual != expected:
        manifest["status"] = "COVERAGE_GAP"
        manifest["missing"] = sorted(expected - actual)
        manifest["extra"] = sorted(actual - expected)
        atomic_json(manifest_path, manifest)
        return 1
    manifest["status"] = "PASS_EXACT_NO_GAP"
    manifest["failure"] = None
    atomic_json(manifest_path, manifest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
