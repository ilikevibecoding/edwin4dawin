#!/usr/bin/env python3
"""Replay the exact n>=39 rank-eight terminal-broom Delta^7 theorem."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "rank8_q8_terminal_delta7_d5_branches_exact_20260817.json"
OUTPUT = ROOT / "rank8_q8_terminal_delta7_large_replay_20260817.json"
CAPACITY_MARKER = (
    "PASS_EXACT_RANK8_TERMINAL_DELTA7_CAPACITY_REDUCTION_WITH_D5_OBSTRUCTION"
)
BRANCH_MARKER = "PASS_EXACT_RANK8_DELTA7_FULL_D5_BRANCH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(command: list[str], marker: str) -> str:
    result = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if result.returncode != 0 or marker not in result.stdout:
        raise RuntimeError(f"command failed: {command!r}\n{result.stdout}")
    return result.stdout


def rebuild_branch(branch: dict) -> str:
    return run(
        [
            sys.executable,
            "-u",
            str(ROOT / "probe_rank8_q8_terminal_delta7_d5_bernstein.py"),
            "--e",
            str(branch["capacity_E"]),
            "--k",
            str(branch["D6_k"]),
            "--no-split",
        ],
        BRANCH_MARKER,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="recompute all four exact Bernstein tensors in parallel",
    )
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["schema"] == "rank8-q8-terminal-delta7-full-d5-bernstein-v1"
    assert manifest["status"] == "PASS"
    assert manifest["theorem_range"] == "n>=39"
    assert manifest["branch_count"] == 4
    assert manifest["cleared_degrees"] == [44, 20, 9, 8, 5]
    assert manifest["coefficients_per_branch"] == 510300

    probe = ROOT / manifest["probe"]["file"]
    assert sha256(probe) == manifest["probe"]["sha256"]
    capacity_script = ROOT / manifest["capacity_reduction"]["file"]
    assert sha256(capacity_script) == manifest["capacity_reduction"]["sha256"]

    capacity_output = run(
        [sys.executable, "-u", str(capacity_script)],
        CAPACITY_MARKER,
    )
    capacity_report = ROOT / manifest["capacity_reduction"]["report"]
    assert sha256(capacity_report) == manifest["capacity_reduction"]["report_sha256"]

    branches = manifest["branches"]
    keys = {(row["capacity_E"], row["D6_k"]) for row in branches}
    assert keys == {(0, 1), (0, 7), (1, 1), (1, 7)}

    if args.rebuild:
        with ThreadPoolExecutor(max_workers=4) as executor:
            outputs = list(executor.map(rebuild_branch, branches))
        assert all(BRANCH_MARKER in output for output in outputs)

    for row in branches:
        report_path = ROOT / row["report"]
        assert sha256(report_path) == row["sha256"]
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["status"] == "PASS"
        assert report["branch"] == {
            "capacity_E": row["capacity_E"],
            "D6_k": row["D6_k"],
        }
        assert report["domain"] == "n>=39, full D4 and full interior D5 intervals"
        assert report["box"] == ["T", "W", "A", "U", "V"]
        assert report["cleared_degrees"] == [44, 20, 9, 8, 5]
        assert report["initial_coefficients"] == 510300
        assert report["initial_minimum"] == "0"
        assert report["initial_minimum_index"] == [0, 0, 0, 0, 0]
        assert report["denominator_minimum"] == "0"
        assert report["denominator_minimum_index"] == [0, 0, 0, 0, 0]
        assert report["certificate"]["status"] == "PASS"
        assert report["certificate"]["leaves"] == 1
        assert report["certificate"]["deepest"] == 0

    artifacts = [
        "RANK8_Q8_TERMINAL_DELTA7_LARGE_ORDER_THEOREM_2026-08-17.md",
        "replay_rank8_q8_terminal_delta7_large.py",
        MANIFEST.name,
        manifest["probe"]["file"],
        manifest["capacity_reduction"]["file"],
        manifest["capacity_reduction"]["report"],
    ] + [row["report"] for row in branches]
    payload = {
        "schema": "rank8-q8-terminal-delta7-large-replay-v1",
        "status": "PASS",
        "mode": "full-rebuild" if args.rebuild else "stored-exact-report-integrity",
        "theorem": "Delta^7 R_1 >= 0 for every rooted tree core of order n>=39",
        "branch_count": 4,
        "exact_coefficients": 4 * 510300,
        "capacity_marker": CAPACITY_MARKER,
        "capacity_output_last_line": capacity_output.strip().splitlines()[-1],
        "artifacts_sha256": {name: sha256(ROOT / name) for name in artifacts},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("RANK8_Q8_TERMINAL_DELTA7_LARGE_REPLAY_PASS")
    print(OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
