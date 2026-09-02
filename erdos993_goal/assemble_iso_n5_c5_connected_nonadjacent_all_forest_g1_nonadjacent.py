#!/usr/bin/env python3
"""Fail-closed wrapper for connected-nonadjacent rank-five C5.

The producer performs the full finite census and every exact Bernstein cone.
This wrapper reruns it by default, pins the producer source/report hashes,
independently audits the finite totals and gapless 23-branch coverage, and
only then emits the theorem PASS marker.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import subprocess
import sys


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "prove_iso_n5_c5_connected_nonadjacent_all_forest_g1_nonadjacent.py"
REPORT = HERE / "iso_n5_c5_connected_nonadjacent_all_forest_exact_g1_nonadjacent_20260830.json"
OUTPUT = HERE / "iso_n5_c5_connected_nonadjacent_all_forest_assembled_g1_nonadjacent_20260830.json"
PRODUCER_MARKER = "PRODUCED_EXACT_ISO_N5_C5_CONNECTED_NONADJACENT_ALL_FOREST_G1_NONADJACENT"
MARKER = "PASS_EXACT_ISO_N5_C5_CONNECTED_NONADJACENT_ALL_FOREST_ASSEMBLED_G1_NONADJACENT"
EXPECTED = {
    PRODUCER.name: "4AEE620CB154B0BEB8A72EA19E0C64E860ACC23E9D73F6939E09354A7C2EE763",
    REPORT.name: "91160843C5B3A3878BBDCFFDE7667649B5A608F24C1886F0F8221F69BAF4D0DE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rerun_producer() -> None:
    result = subprocess.run(
        [sys.executable, PRODUCER.name],
        cwd=HERE,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0 or PRODUCER_MARKER not in result.stdout:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise AssertionError((result.returncode, PRODUCER_MARKER))
    print(json.dumps({"replayed": PRODUCER.name, "marker": PRODUCER_MARKER}), flush=True)


def validate() -> dict:
    actual = {path.name: sha256(path) for path in (PRODUCER, REPORT)}
    assert actual == EXPECTED
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["marker"] == PRODUCER_MARKER
    assert report["source_sha256"] == actual[PRODUCER.name]
    assert report["coverage_assembly"] == {
        "finite": "|A|<=12, equivalently |G|<=14",
        "all_order": "|A|>=13",
        "gap": "none within connected-nonadjacent C5",
    }

    finite = report["finite_certificate"]
    assert finite["orders_of_G"] == [2, 14]
    assert finite["orders_of_A"] == [0, 12]
    assert finite["unlabeled_forests"] == 15204
    assert finite["connected_nonadjacent_mark_cells"] == 748426
    assert finite["global_minimum"]["value"] == 0
    assert finite["raw_reconstruction_checked_cellwise"] is True
    assert finite["known_unlabeled_forest_counts_checked"] is True
    assert sum(row["unlabeled_forests"] for row in finite["rows"].values()) == 15204
    assert sum(
        row["connected_nonadjacent_mark_cells"] for row in finite["rows"].values()
    ) == 748426

    cone = report["ratio_cone_certificate"]
    branches = cone["branches"]
    assert cone["branch_count"] == len(branches) == 23
    expected_branches = set()
    for order in [None, *range(7)]:
        label = "ordered |B|,|C|>=7" if order is None else f"ordered |B|={order}, |A|>=13"
        expected_branches.add(("distance>=3, r=0, D empty", label))
        expected_branches.add(("distance=2, r>=0, |D|=r+1", label))
    for order in [None, *range(1, 7)]:
        label = "ordered |B|,|C|>=7" if order is None else f"ordered |B|={order}, |A|>=13"
        expected_branches.add(("distance>=3, r>=1, |D|=r", label))
    observed = {(row["geometry_branch"], row["order_branch"]) for row in branches}
    assert observed == expected_branches
    assert len(observed) == len(branches)
    assert all(row["negative"] == 0 and Fraction(row["minimum"]) >= 0 for row in branches)
    assert sum(row["bernstein_coefficients"] for row in branches) == 380700
    assert cone["bernstein_coefficients"] == 380700
    assert cone["all_coefficients_nonnegative"] is True

    exceptional = cone["exceptional_r_minus_one"]
    assert exceptional["b_zero_sign"] == "zero at c=0,1 and positive for every integer c>=2"
    assert exceptional["strictly_positive_power_coefficients"] > 0
    assert "r=-1 forces e(A)=0" in exceptional["geometry"]

    geometry = report["geometry_certificate"]
    assert "r=e(A)+c0-1" in geometry["component_argument"]
    assert geometry["edge_budget"] == "e(A)<=r+1 and r>=-1"
    assert "|D|=r+s" in geometry["D_order"]
    algebra = report["algebra_certificate"]
    assert algebra["unique_worst_rows"] == {
        "B_and_C": "rank-2 path floor, rank-3 path floor, rank-4 subset ceiling",
        "D": "rank-2 path floor, rank-3 subset ceiling",
    }

    dependencies = report["dependencies_sha256"]
    assert all(sha256(HERE / name) == digest for name, digest in dependencies.items())
    return {
        "producer_hashes": actual,
        "dependency_hashes": dependencies,
        "finite_forests": finite["unlabeled_forests"],
        "finite_connected_nonadjacent_cells": finite["connected_nonadjacent_mark_cells"],
        "finite_stream_sha256": finite["ordered_cell_stream_sha256"],
        "cone_branches": len(branches),
        "bernstein_coefficients": cone["bernstein_coefficients"],
        "branch_coverage_exact": True,
        "all_coefficients_nonnegative": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--reuse-producer",
        action="store_true",
        help="validate the frozen producer report without rerunning the expensive census",
    )
    args = parser.parse_args()
    if not args.reuse_producer:
        rerun_producer()
    audit = validate()
    assembled = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G and every pair of nonadjacent vertices u,v "
            "in the same connected component, C5=[z^4w^4]R-[z^3w^5]R is nonnegative."
        ),
        "independent_fail_closed_audit": audit,
        "replay_mode": "reused immediately replayed producer" if args.reuse_producer else "reran producer from scratch",
        "scope": (
            "Connected-nonadjacent C5 only. This does not prove M5, M5+3*C5, "
            "no-mark-root g1, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(assembled, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": audit["finite_forests"],
        "finite_connected_nonadjacent_cells": audit["finite_connected_nonadjacent_cells"],
        "cone_branches": audit["cone_branches"],
        "bernstein_coefficients": audit["bernstein_coefficients"],
        "replay_mode": assembled["replay_mode"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
