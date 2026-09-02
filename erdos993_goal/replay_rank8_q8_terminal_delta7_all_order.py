#!/usr/bin/env python3
"""Replay the all-order rank-eight terminal-broom Delta7 theorem."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "rank8_q8_terminal_delta7_all_order_manifest_20260817.json"
OUTPUT = ROOT / "rank8_q8_terminal_delta7_all_order_replay_20260817.json"
CAPACITY_MARKER = "PASS_EXACT_RANK8_TERMINAL_DELTA7_CAPACITY_REDUCTION_WITH_D5_OBSTRUCTION"
BRANCH_MARKER = "PASS_EXACT_RANK8_DELTA7_THRESHOLD_BRANCH"
FINITE_MARKER = "PASS_EXACT_RANK8_TERMINAL_DELTA7_ALL_ROOTED_CORES_N1_THROUGH_N17"


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


def rebuild_branch(row: dict) -> str:
    return run(
        [
            sys.executable,
            "-u",
            str(ROOT / "probe_rank8_q8_terminal_delta7_cutoff.py"),
            "--order",
            "18",
            "--e",
            str(row["capacity_E"]),
            "--k",
            str(row["D6_k"]),
            "--no-split",
        ],
        BRANCH_MARKER,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--rebuild-analytic",
        action="store_true",
        help="recompute the four 510,300-entry Bernstein tensors in parallel",
    )
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["schema"] == "rank8-q8-terminal-delta7-all-order-v1"
    assert manifest["status"] == "PASS"
    assert manifest["analytic_range"] == "n>=18"
    assert manifest["finite_range"] == "1<=n<=17"

    analytic = manifest["analytic_certificate"]
    assert analytic["branch_count"] == 4
    assert analytic["cleared_degrees"] == [44, 20, 9, 8, 5]
    assert analytic["coefficients_per_branch"] == 510300
    assert sha256(ROOT / analytic["probe"]["file"]) == analytic["probe"]["sha256"]
    for name, expected_hash in analytic["dependencies"].items():
        assert sha256(ROOT / name) == expected_hash

    capacity = manifest["capacity_reduction"]
    capacity_script = ROOT / capacity["file"]
    assert sha256(capacity_script) == capacity["sha256"]
    capacity_output = run([sys.executable, "-u", str(capacity_script)], CAPACITY_MARKER)
    assert sha256(ROOT / capacity["report"]) == capacity["report_sha256"]

    branches = analytic["branches"]
    assert {(row["capacity_E"], row["D6_k"]) for row in branches} == {
        (0, 1), (0, 7), (1, 1), (1, 7)
    }
    if args.rebuild_analytic:
        with ThreadPoolExecutor(max_workers=4) as executor:
            outputs = list(executor.map(rebuild_branch, branches))
        assert all(BRANCH_MARKER in output for output in outputs)
    for row in branches:
        report_path = ROOT / row["report"]
        assert sha256(report_path) == row["sha256"]
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["status"] == "PASS"
        assert report["threshold"] == 18
        assert report["branch"] == {
            "capacity_E": row["capacity_E"], "D6_k": row["D6_k"]
        }
        assert report["cleared_degrees"] == [44, 20, 9, 8, 5]
        assert report["initial_coefficients"] == 510300
        assert report["initial_minimum"] == "0"
        assert report["initial_minimum_index"] == [0, 0, 0, 0, 0]
        assert report["certificate"]["status"] == "PASS"
        assert report["certificate"]["leaves"] == 1
        assert report["certificate"]["deepest"] == 0

    finite = manifest["finite_certificate"]
    assert sha256(ROOT / finite["source"]) == finite["source_sha256"]
    assert sha256(ROOT / finite["replay"]) == finite["replay_sha256"]
    finite_output = run([sys.executable, "-u", str(ROOT / finite["replay"])], FINITE_MARKER)
    finite_report_path = ROOT / finite["report"]
    assert sha256(finite_report_path) == finite["sha256"]
    finite_report = json.loads(finite_report_path.read_text(encoding="utf-8"))
    assert finite_report["status"] == FINITE_MARKER
    assert finite_report["totals"] == {
        "free_trees": 81137,
        "rooted_cores": 1324073,
        "active_rooted_cores": 1321301,
    }
    assert all(row["Delta7_minimum"] >= 0 for row in finite_report["rows"])

    artifacts = [
        "RANK8_Q8_TERMINAL_DELTA7_ALL_ORDER_THEOREM_2026-08-17.md",
        "replay_rank8_q8_terminal_delta7_all_order.py",
        MANIFEST.name,
        analytic["probe"]["file"],
        capacity["file"],
        capacity["report"],
        finite["source"],
        finite["replay"],
        finite["report"],
    ] + list(analytic["dependencies"]) + [row["report"] for row in branches]
    payload = {
        "schema": "rank8-q8-terminal-delta7-all-order-replay-v1",
        "status": "PASS",
        "mode": "full-analytic-rebuild" if args.rebuild_analytic else "stored-analytic-integrity-plus-fresh-finite-census",
        "theorem": manifest["theorem"],
        "analytic_exact_coefficients": 4 * 510300,
        "finite_totals": finite_report["totals"],
        "capacity_output_last_line": capacity_output.strip().splitlines()[-1],
        "finite_output_last_line": finite_output.strip().splitlines()[-1],
        "artifacts_sha256": {name: sha256(ROOT / name) for name in artifacts},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("RANK8_Q8_TERMINAL_DELTA7_ALL_ORDER_REPLAY_PASS")
    print(OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
