#!/usr/bin/env python3
"""Run one exact finite-N ordinary-parent forest-jet census case."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from census_iso_n6_bundle_g2_adjacent_forest_jets_n14_18_root import (
    enumerate_forest_polynomials,
)
from census_iso_n6_bundle_g2_nonadjacent_ordinary_safe_abs_forest_jets_n9_18_root import (
    LOSS_REPORT,
    LOSS_REPORT_SHA256,
    NO_PARENT_REPORT,
    NO_PARENT_REPORT_SHA256,
    audit_order,
    sha256,
)


HERE = Path(__file__).resolve().parent
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_CORNER_PAID_"
    "FOREST_JETS_SINGLE_CASE_ROOT"
)
OBSTRUCTION = (
    "OBSTRUCTION_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_CORNER_PAID_"
    "FOREST_JETS_SINGLE_CASE_ROOT"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, choices=range(9, 19), required=True)
    parser.add_argument(
        "--geometry", choices=("common0", "common1"), required=True
    )
    args = parser.parse_args()
    assert sha256(NO_PARENT_REPORT) == NO_PARENT_REPORT_SHA256
    assert sha256(LOSS_REPORT) == LOSS_REPORT_SHA256

    forests, enumeration = enumerate_forest_polynomials(args.n)
    result = audit_order(args.n, forests[args.n], args.geometry)
    marker = (
        MARKER if result["negative_corner_paid_corners"] == 0 else OBSTRUCTION
    )
    report = {
        "marker": marker,
        "status": (
            "PASS exact single finite-N ordinary-parent corner-paid forest-jet census"
            if marker == MARKER
            else "obstruction to the corner-paid relaxation"
        ),
        "N": args.n,
        "geometry": args.geometry,
        "enumeration": enumeration,
        "result": result,
        "no_parent_report": {
            "file": NO_PARENT_REPORT.name,
            "sha256": NO_PARENT_REPORT_SHA256,
        },
        "loss_report": {
            "file": LOSS_REPORT.name,
            "sha256": LOSS_REPORT_SHA256,
        },
        "coverage_argument": (
            "Identical to the pinned sequential n9..18 census: exact forest "
            "i0..i7 jets, all feasible sorted B,C order triples, all retained "
            "row endpoints, both D2 endpoints, and all sixteen independently "
            "paid ordinary-parent loss coordinates."
        ),
        "scope_guard": (
            "One ambient order and one common-neighbor geometry only; assembly "
            "with the other finite and large-order certificates is separate."
        ),
        "sequential_source": (
            "census_iso_n6_bundle_g2_nonadjacent_ordinary_safe_abs_"
            "forest_jets_n9_18_root.py"
        ),
        "sequential_source_sha256": sha256(
            HERE / (
                "census_iso_n6_bundle_g2_nonadjacent_ordinary_safe_abs_"
                "forest_jets_n9_18_root.py"
            )
        ),
        "source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = HERE / (
        "iso_n6_bundle_g2_nonadjacent_ordinary_corner_paid_forest_jets_"
        f"n{args.n}_{args.geometry}_single_exact_root_20260831.json"
    )
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": marker,
        "N": args.n,
        "geometry": args.geometry,
        "checks": result["literal_corner_paid_checks"],
        "negative": result["negative_corner_paid_corners"],
        "minimum": result["minimum"],
    }, indent=2, sort_keys=True), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
