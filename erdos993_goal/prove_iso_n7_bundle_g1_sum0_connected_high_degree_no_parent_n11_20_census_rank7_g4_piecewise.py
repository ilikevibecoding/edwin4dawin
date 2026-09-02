#!/usr/bin/env python3
"""Gapless exact actual-tree closure of the residual G1 cell at orders 11..20."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import numba
import numpy as np

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11_20_census_rank7_g4_piecewise as census


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11_20_"
    "census_exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N11_20_CENSUS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11_20_census_rank7_g4_piecewise.py":
        "FE10DFA6860C821D9F41B213118254AAA49CB26AB1BA60734B100BC2BF74D833",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_rank7_g4_piecewise.py":
        "E7977003DAFE9707C913F5C05976F90EFB82FF4C52A09172D9287C0C86D91B1A",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n34_36_batch_exact_rank7_g4_piecewise_20260831.json":
        "56669CA72F57CC0BA85F53584BBD2CAE7EE9862E94C3B787F050519FC45A98E0",
}
EXPECTED_PROBE_REPORT_SHA256 = (
    "CDC76156B1253C63AD6B91CA56478E3D0368C051C2A0A5EF4394F05B3BA59F4C"
)
EXPECTED_STREAM = (
    "2B333DE12DAE79753D769D27000468CF76CCBE5A567D6CB9545A5646A93CA36C"
)
EXPECTED_ELIGIBLE = {
    11: 54,
    12: 195,
    13: 630,
    14: 1886,
    15: 5373,
    16: 14844,
    17: 40167,
    18: 107477,
    19: 285707,
    20: 757890,
}
EXPECTED_GLOBAL_MINIMUM = [
    952616,
    11,
    222,
    "JsOGQ?@O??_",
    [4, 3, 3, 2, 2, 1, 1, 1, 1, 1, 1],
    [1, 11, 45, 89, 89, 43, 10, 1, 0],
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    assert (nx.__version__, numba.__version__, np.__version__) == (
        "3.6.1", "0.63.1", "2.3.5"
    )

    # Re-run the full producer in this authoritative invocation.
    census.main()
    assert sha256(census.OUTPUT) == EXPECTED_PROBE_REPORT_SHA256
    raw = json.loads(census.OUTPUT.read_text(encoding="utf-8"))
    assert raw["marker"] == census.MARKER
    assert raw["status"] == "exact sizing probe; expected stream not yet frozen"
    assert raw["tree_counts"] == {str(key): value for key, value in census.TREE_COUNTS.items()}
    assert raw["eligible_total"] == 1_214_223
    assert raw["negative_total"] == 0
    assert raw["global_minimum"] == EXPECTED_GLOBAL_MINIMUM
    assert raw["crosschecks"] == 296
    assert raw["ordered_tree_value_stream_sha256"] == EXPECTED_STREAM
    for order, expected in EXPECTED_ELIGIBLE.items():
        item = raw["order_reports"][str(order)]
        assert item["free_trees"] == census.TREE_COUNTS[order]
        assert item["eligible_trees"] == expected
        assert item["negative"] == 0
        assert item["minimum"][0] > 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W of order 11<=m<=20 with maximum "
            "degree at least four and at least three branching vertices, "
            "the exact rank-seven common0/sum0 no-parent coefficient G1 "
            "is strictly positive."
        ),
        "gapless_census": {
            "orders": [11, 20],
            "free_tree_counts": census.TREE_COUNTS,
            "free_trees_total": sum(census.TREE_COUNTS.values()),
            "eligible_trees_by_order": EXPECTED_ELIGIBLE,
            "eligible_trees_total": raw["eligible_total"],
            "negative": raw["negative_total"],
            "global_minimum_G1": raw["global_minimum"],
            "periodic_independent_recurrence_crosschecks": raw["crosschecks"],
            "ordered_tree_value_stream_sha256": EXPECTED_STREAM,
            "coverage_gap": None,
        },
        "scope": (
            "Actual connected-tree G1 at unmarked orders 11..20, "
            "common0/sum0 no-parent, maximum degree>=4, and at least three "
            "branching vertices. Orders 21..31 remain the finite complement "
            "before the separately pinned n32+ theorem."
        ),
        "coverage_gap_within_stated_actual_n11_20_scope": None,
        "dependencies_sha256": DEPENDENCIES,
        "replayed_probe_report_sha256": EXPECTED_PROBE_REPORT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orders": [11, 20],
        "eligible_trees": raw["eligible_total"],
        "negative": raw["negative_total"],
        "minimum_G1": raw["global_minimum"][0],
        "coverage_gap_within_stated_actual_n11_20_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
