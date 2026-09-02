#!/usr/bin/env python3
"""Fail-closed assembly of the complete canonical no_parent_k0 g2 mode.

The two marked vertices in a simple forest are either adjacent or
nonadjacent.  Separate exact all-forest certificates cover those exhaustive
cases.  This assembler pins both theorem sources and reports and promotes only
their union: the first of the five canonical rank-five g2 modes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_no_parent_k0_all_forest_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_NO_PARENT_K0_ALL_FOREST_RANK5_G2_ALT"
ADJACENT_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_ALL_FOREST_RANK5_G2_ALT"
NONADJACENT_MARKER = "PASS_EXACT_ISO_N5_G2_NONADJACENT_ALL_FOREST_RANK5_G2_ALT"

ADJACENT_SOURCE = HERE / "prove_iso_n5_g2_adjacent_all_forest_rank5_g2_alt.py"
ADJACENT_REPORT = HERE / "iso_n5_g2_adjacent_all_forest_exact_rank5_g2_alt_20260830.json"
NONADJACENT_SOURCE = HERE / "prove_iso_n5_g2_nonadjacent_all_forest_rank5_g2_alt.py"
NONADJACENT_REPORT = HERE / "iso_n5_g2_nonadjacent_all_forest_exact_rank5_g2_alt_20260830.json"
ADJACENT_FINITE_REPORT = HERE / "iso_n5_g2_adjacent_all_forest_finite_census_rank5_g2_alt_20260830.json"

# Frozen only after the nonadjacent theorem and an independent assembly replay.
EXPECTED_HASHES: dict[str, str] = {
    "prove_iso_n5_g2_adjacent_all_forest_rank5_g2_alt.py":
        "BDFDB0E77A8C5FD275CAEE1B50964E476E9D0D01C40CA083B26F39F74DBE34A3",
    "iso_n5_g2_adjacent_all_forest_exact_rank5_g2_alt_20260830.json":
        "F9981588CC2663D0AEAF92E9DCA86488092845D25E1870196878C6BBFBB315C8",
    "prove_iso_n5_g2_nonadjacent_all_forest_rank5_g2_alt.py":
        "94B3C3767901578A26D5F2D89A7693B39B8FF7AFE5E11F07A64E3E1EBBB56B24",
    "iso_n5_g2_nonadjacent_all_forest_exact_rank5_g2_alt_20260830.json":
        "397EB502A3F83407B8B4EAF5945544561035362971EF441B357B74BA12B67FB2",
    "iso_n5_g2_adjacent_all_forest_finite_census_rank5_g2_alt_20260830.json":
        "F303810A1637A962824BC0318AE38EF64AE2EE360BE1590861E38C8338C4CB0D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rerun(source: Path, marker: str) -> None:
    result = subprocess.run(
        [sys.executable, source.name], cwd=HERE, text=True,
        capture_output=True, check=False,
    )
    if result.returncode != 0 or marker not in result.stdout:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise AssertionError((source.name, result.returncode, marker))
    print(json.dumps({"replayed": source.name, "marker": marker}), flush=True)


def validate_branch(path: Path, marker: str, branch: str) -> dict:
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["marker"] == marker
    assert report["ratio_cone_certificate"]["all_coefficients_nonnegative"] is True
    assert report["coverage_assembly"]["gap"].startswith("none within")
    assert report["finite_certificate"]["orders_of_G"] == [2, 14]
    assert report["finite_certificate"]["orders_of_A"] == [0, 12]
    for name, expected in report["dependencies_sha256"].items():
        assert sha256(HERE / name) == expected
    if branch == "adjacent":
        source = ADJACENT_SOURCE
        assert report["ratio_cone_certificate"]["branch_count"] == 8
        assert report["ratio_cone_certificate"]["corner_pairs"] == 2048
        assert report["finite_certificate"]["adjacent_mark_cells"] == 165944
        cells = report["finite_certificate"]["adjacent_mark_cells"]
        assert "Adjacent-mark no-parent g2 only" in report["scope"]
    else:
        source = NONADJACENT_SOURCE
        assert report["ratio_cone_certificate"]["branch_count"] == 16
        assert report["ratio_cone_certificate"]["corner_pairs"] == 4096
        assert report["finite_certificate"]["nonadjacent_mark_cells"] == 1070270
        cells = report["finite_certificate"]["nonadjacent_mark_cells"]
        assert "Nonadjacent-mark no_parent_k0 g2 only" in report["scope"]
    assert report["source_sha256"] == sha256(source)
    return {
        "branch": branch,
        "theorem": report["theorem"],
        "finite_mark_cells": cells,
        "all_order_cone_branches": report["ratio_cone_certificate"]["branch_count"],
        "all_order_corner_pairs": report["ratio_cone_certificate"]["corner_pairs"],
        "report_sha256": sha256(path),
        "source_sha256_recorded": report["source_sha256"],
    }


def validate_hashes() -> dict[str, str]:
    paths = [
        ADJACENT_SOURCE, ADJACENT_REPORT, NONADJACENT_SOURCE,
        NONADJACENT_REPORT, ADJACENT_FINITE_REPORT,
    ]
    actual = {path.name: sha256(path) for path in paths}
    assert EXPECTED_HASHES, "dependency hash table has not been frozen"
    assert actual == EXPECTED_HASHES
    return actual


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--replay", action="store_true",
        help="replay both frozen subtheorems before assembling the whole mode",
    )
    args = parser.parse_args()
    if args.replay:
        rerun(ADJACENT_SOURCE, ADJACENT_MARKER)
        rerun(NONADJACENT_SOURCE, NONADJACENT_MARKER)

    hashes = validate_hashes()
    adjacent = validate_branch(ADJACENT_REPORT, ADJACENT_MARKER, "adjacent")
    nonadjacent = validate_branch(
        NONADJACENT_REPORT, NONADJACENT_MARKER, "nonadjacent"
    )
    total_finite_cells = adjacent["finite_mark_cells"] + nonadjacent["finite_mark_cells"]

    adjacent_finite = json.loads(ADJACENT_REPORT.read_text(encoding="utf-8"))[
        "finite_certificate"
    ]
    nonadjacent_finite = json.loads(NONADJACENT_REPORT.read_text(encoding="utf-8"))[
        "finite_certificate"
    ]
    # Both censuses use the same complete 15,204-forest order range.  Check the
    # edge/nonedge cell partition against all unordered vertex pairs directly.
    finite_adj_report = json.loads(ADJACENT_FINITE_REPORT.read_text(encoding="utf-8"))
    expected_pairs = sum(
        row["unlabeled_forests"] * math.comb(int(order), 2)
        for order, row in finite_adj_report["rows"].items()
    )
    assert adjacent_finite["unlabeled_forests"] == 15204
    assert nonadjacent_finite["unlabeled_forests"] == 15204
    assert total_finite_cells == expected_pairs == 1236214

    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G and every two distinct marked vertices u,v, "
            "the exact canonical no_parent_k0 rank-five whole-bundle coefficient "
            "g2 is nonnegative."
        ),
        "case_partition": {
            "adjacent": adjacent,
            "nonadjacent": nonadjacent,
            "exhaustive": (
                "A pair of distinct vertices in a simple forest is exactly one of "
                "an edge or a nonedge; the subtheorems cover those disjoint cases."
            ),
        },
        "finite_crosscheck": {
            "orders_of_G": [2, 14],
            "unlabeled_forests": 15204,
            "adjacent_cells": adjacent["finite_mark_cells"],
            "nonadjacent_cells": nonadjacent["finite_mark_cells"],
            "all_unordered_mark_pairs": total_finite_cells,
            "independent_pair_count": expected_pairs,
            "partition_exact": True,
        },
        "all_order_crosscheck": {
            "adjacent_cone_branches": adjacent["all_order_cone_branches"],
            "nonadjacent_cone_branches": nonadjacent["all_order_cone_branches"],
            "adjacent_corner_pairs": adjacent["all_order_corner_pairs"],
            "nonadjacent_corner_pairs": nonadjacent["all_order_corner_pairs"],
            "mark_relation_cases_exhaustive": True,
        },
        "canonical_mode": "no_parent_k0",
        "canonical_mode_index": 1,
        "canonical_mode_count": 5,
        "canonical_scope_map": {
            "completed_by_this_assembly": ["no_parent_k0"],
            "remaining": [
                "singleton_ordinary",
                "singleton_endpoint_p_equals_u",
                "internal_spine_broom_ordinary",
                "internal_spine_broom_endpoint",
            ],
        },
        "dependencies_sha256": hashes,
        "scope": (
            "The entire canonical no_parent_k0 g2 mode, and only that mode. "
            "The other four canonical deepest-support g2 modes, all N5, and "
            "Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "canonical_mode": report["canonical_mode"],
        "finite_mark_pairs": total_finite_cells,
        "adjacent_cone_branches": adjacent["all_order_cone_branches"],
        "nonadjacent_cone_branches": nonadjacent["all_order_cone_branches"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
