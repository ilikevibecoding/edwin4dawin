#!/usr/bin/env python3
"""Compile and replay the exact connected alpha=11 census at orders 21,22."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "verify_rank7_alpha11_connected_n21_n22.rs"
ENGINE = ROOT / "verify_forest_v7_medium_trees.rs"
MODULE = ROOT / "verify_rank7_alpha11_connected_n21_n22.wasm"
RUNNER = ROOT / "verify_rank7_alpha11_connected_n21_n22.js"
DEFAULT_REPORT = ROOT / "rank7_alpha11_connected_n21_n22_exact_20260813.json"
TARGET = "wasm32-wasip1"
LINE = re.compile(
    r"order=(?P<order>\d+) trees=(?P<trees>\d+) "
    r"alpha11=(?P<alpha11>\d+) negative=(?P<negative>\d+) "
    r"minimum=(?P<minimum>-?\d+) witness_layout=(?P<layout>\[[^\n]*?\]) "
    r"witness_polynomial=(?P<polynomial>\[[^\n]*?\])"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(program: str) -> str:
    found = shutil.which(program)
    if found is None:
        raise RuntimeError(f"required program is not installed: {program}")
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()

    rustc = require("rustc")
    rustup = require("rustup")
    node = require("node")
    installed = subprocess.run(
        [rustup, "target", "list", "--installed"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    if TARGET not in installed:
        raise RuntimeError(f"missing Rust target {TARGET}")
    subprocess.run(
        [rustc, "-O", "--target", TARGET, str(SOURCE), "-o", str(MODULE)],
        check=True,
        cwd=ROOT,
    )
    replay = subprocess.run(
        [node, str(RUNNER)],
        check=True,
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if "PASS_EXACT_CONNECTED_ALPHA11_V7_ORDERS21_22" not in replay.stdout:
        raise AssertionError(replay.stdout)

    records = {}
    for match in LINE.finditer(replay.stdout):
        row = {
            "trees": int(match.group("trees")),
            "alpha11_trees": int(match.group("alpha11")),
            "negative_V7_alpha11_trees": int(match.group("negative")),
            "minimum_V7_alpha11": int(match.group("minimum")),
            "minimum_witness_layout": json.loads(match.group("layout")),
            "minimum_witness_coefficients_i0_through_i7": json.loads(
                match.group("polynomial")
            ),
        }
        records[match.group("order")] = row

    expected = {
        "21": (2_144_505, 136_882, 9_837_828),
        "22": (5_623_756, 54_564, 218_312_640),
    }
    assert set(records) == set(expected)
    for order, (trees, alpha11, minimum) in expected.items():
        row = records[order]
        assert row["trees"] == trees
        assert row["alpha11_trees"] == alpha11
        assert row["negative_V7_alpha11_trees"] == 0
        assert row["minimum_V7_alpha11"] == minimum > 0

    report = {
        "status": "PASS_EXACT_CONNECTED_ALPHA11_V7_ORDERS21_22",
        "method": (
            "Wright-Richmond-Odlyzko-McKay canonical free-tree successor; "
            "exact independence-number recursion and i0..i7 integer recursion"
        ),
        "records": records,
        "hashes": {
            SOURCE.name: sha256(SOURCE),
            ENGINE.name: sha256(ENGINE),
            RUNNER.name: sha256(RUNNER),
            MODULE.name: sha256(MODULE),
        },
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(replay.stdout, end="")
    print(f"report_sha256={sha256(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
