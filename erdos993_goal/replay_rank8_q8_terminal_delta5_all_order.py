#!/usr/bin/env python3
"""Replay the exact all-order rank-eight terminal Delta5 theorem package."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "rank8_q8_terminal_delta5_all_order_manifest_20260817.json"
OUTPUT = ROOT / "rank8_q8_terminal_delta5_all_order_replay_20260817.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(script: str, marker: str, arguments: list[str] | None = None) -> str:
    command = [sys.executable, "-u", str(ROOT / script)]
    if arguments:
        command.extend(arguments)
    result = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if result.returncode or marker not in result.stdout:
        raise RuntimeError(f"{' '.join(command)}\n{result.stdout}")
    return result.stdout


def validate_hashed_file(name: str, expected: str) -> None:
    actual = sha256(ROOT / name)
    assert actual == expected, (name, expected, actual)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--rebuild-analytic",
        action="store_true",
        help="recompute all six long exact Bernstein tensors",
    )
    parser.add_argument(
        "--rebuild-finite",
        action="store_true",
        help="recompile and rerun the exact WROM censuses through order 22",
    )
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["schema"] == "rank8-q8-terminal-delta5-all-order-v1"
    assert manifest["status"] == "PASS_CONDITIONAL_ON_PROVED_RANK7_Q7_ALPHA12"
    for name, expected in manifest["package_artifacts"].items():
        validate_hashed_file(name, expected)

    for item in manifest["structural_certificates"]:
        validate_hashed_file(item["file"], item["sha256"])
        run(item["file"], item["marker"])
        validate_hashed_file(item["report"], item["report_sha256"])

    analytic = manifest["analytic_certificate"]
    validate_hashed_file(analytic["probe"], analytic["probe_sha256"])
    for name, expected in analytic["dependencies"].items():
        validate_hashed_file(name, expected)
    if args.rebuild_analytic:
        for branch in analytic["branches"]:
            run(
                analytic["probe"],
                "PASS_EXACT_RANK8_DELTA5_QD5_INTERSECTION_BRANCH",
                [
                    "--order",
                    "23",
                    "--k",
                    str(branch["D6_k"]),
                    "--regime",
                    "low",
                    "--piece",
                    branch["piece"],
                    "--c8-bound",
                    "q7",
                    "--backend",
                    "sympy",
                    "--no-split",
                ],
            )
    total_coefficients = 0
    for branch in analytic["branches"]:
        validate_hashed_file(branch["report"], branch["sha256"])
        payload = json.loads((ROOT / branch["report"]).read_text(encoding="utf-8"))
        assert payload["status"] == "PASS"
        assert payload["threshold"] == 23
        assert payload["D6_k"] == branch["D6_k"]
        assert payload["capacity_piece"] == branch["piece"]
        assert payload["c8_bound"] == "q7"
        assert payload["initial_minimum"] == "0"
        assert payload["certificate"]["status"] == "PASS"
        assert payload["certificate"]["leaves"] == 1
        total_coefficients += payload["initial_coefficients"]
    assert total_coefficients == analytic["total_coefficients"] == 28621872
    for item in analytic.get("redundant_exact_stress_certificates", []):
        validate_hashed_file(item["report"], item["sha256"])
        payload = json.loads((ROOT / item["report"]).read_text(encoding="utf-8"))
        assert payload["status"] == "PASS"
        assert payload["initial_minimum"] == "0"

    finite = manifest["finite_certificate"]
    validate_hashed_file(finite["source"], finite["source_sha256"])
    for item in finite["reports"]:
        validate_hashed_file(item["report"], item["sha256"])
        payload = json.loads((ROOT / item["report"]).read_text(encoding="utf-8"))
        assert payload["status"] == item["status"]
        assert all(row["Delta5_minimum"] >= 0 for row in payload["rows"])
    if args.rebuild_finite:
        for item in finite["replays"]:
            validate_hashed_file(item["file"], item["sha256"])
            run(item["file"], item["marker"])
        for item in finite["reports"]:
            validate_hashed_file(item["report"], item["sha256"])

    no_go = manifest["preserved_relaxation_no_gos"]
    for name, expected in no_go["files"].items():
        validate_hashed_file(name, expected)
    no_go_payload = json.loads((ROOT / no_go["report"]).read_text(encoding="utf-8"))
    assert no_go_payload["status"] == "EXACT_RELAXED_CONE_NO_GOS_NOT_ROOTED_COUNTEREXAMPLES"
    assert all(not witness["checks"]["rank7_Q7"] for witness in no_go_payload["witnesses"])

    artifact_names = [
        MANIFEST.name,
        "RANK8_Q8_TERMINAL_DELTA5_ALL_ORDER_THEOREM_2026-08-17.md",
        Path(__file__).name,
        analytic["probe"],
        *analytic["dependencies"],
        *[item["file"] for item in manifest["structural_certificates"]],
        *[item["report"] for item in manifest["structural_certificates"]],
        *[branch["report"] for branch in analytic["branches"]],
        *[
            item["report"]
            for item in analytic.get("redundant_exact_stress_certificates", [])
        ],
        finite["source"],
        *[item["report"] for item in finite["reports"]],
        *[item["file"] for item in finite["replays"]],
        *no_go["files"],
    ]
    artifact_names = list(dict.fromkeys(artifact_names))
    payload = {
        "schema": "rank8-q8-terminal-delta5-all-order-replay-v1",
        "status": "PASS",
        "dependency": manifest["dependency"],
        "analytic_range": manifest["analytic_range"],
        "finite_range": manifest["finite_range"],
        "analytic_coefficients": total_coefficients,
        "rooted_tree_counterexample": None,
        "remaining_terminal_coefficients": [0, 1, 2, 3, 4],
        "artifacts_sha256": {
            name: sha256(ROOT / name) for name in artifact_names
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("RANK8_Q8_TERMINAL_DELTA5_ALL_ORDER_REPLAY_PASS")
    print(OUTPUT.name, sha256(OUTPUT).upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
