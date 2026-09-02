#!/usr/bin/env python3
"""Exact core/leaf theorem for the degree-two-free order-26 G1 lane."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N26_DEGREE2FREE_CORE_LEAF_"
    "CENSUS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_rank7_g4_piecewise.py":
        "0F675B657D11B34A80DD0446EE58A8BC6627BE641838AEECA001CC9BFC3D7300",
    "probe_iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_rank7_g4_piecewise_20260831.json":
        "7DBEAE97B1BA97CA49836061913D57D9DBC0D4316FD6B14D32B22A4C0CB39486",
    "derive_iso_n7_bundle_g1_parent_modes_rank7_g4_piecewise.py":
        "3C4F8170E28763B85028C5B812B2305CCBC3DD3777258199D9A9AA51CE96AE8D",
    "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json":
        "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490",
}
EXPECTED_CORE_COUNTS = {
    "3": (1, 190, 190),
    "4": (2, 1938, 1938),
    "5": (3, 8500, 8500),
    "6": (6, 32123, 32123),
    "7": (11, 67782, 67782),
    "8": (23, 99363, 99363),
    "9": (47, 78033, 78033),
    "10": (106, 34580, 34580),
    "11": (235, 5220, 5220),
    "12": (551, 135, 0),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Byte-identical complete replay of all bounded core/leaf assignments.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    assert raw["ordered_leaf_assignments"] == 327_864
    assert raw["eligible_assignments"] == 327_729
    assert raw["negative"] == 0
    assert raw["independent_full_tree_crosschecks"] == 320
    assert raw["minimum"]["value"] == 31_516_391_921
    assert raw["ordered_certificate_stream_sha256"] == (
        "36518301169A0AF803F825CB28AFFEB81C6B725D5B049A236ADD236C5D4A5831"
    )
    for order, expected in EXPECTED_CORE_COUNTS.items():
        record = raw["by_core_order"][order]
        assert (
            record["unlabeled_cores"],
            record["ordered_leaf_assignments"],
            record["eligible_assignments"],
        ) == expected

    # Independently replay the common0/sum0 no-parent reduction to the
    # literal q used by the census.
    parent = json.loads((
        HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    assert parent["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G1_PARENT_MODES_RANK7_G4_PIECEWISE"
    )
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}")
        for family in "WABZ" for rank in range(2, 9)
    }
    expression = sp.expand(sp.sympify(
        parent["modes"]["no_parent"]["expression"], locals=symbols
    ))
    shifts = {
        symbols[f"A{rank}"]: symbols[f"W{rank - 1}"]
        for rank in range(4, 9)
    }
    shifts.update({
        symbols[f"B{rank}"]: symbols[f"W{rank - 1}"]
        for rank in range(4, 9)
    })
    shifts.update({
        symbols[f"Z{rank}"]: symbols[f"W{rank - 2}"]
        for rank in range(5, 9)
    })
    reduced = sp.expand(expression.subs(shifts, simultaneous=True))
    w3, w4, w5, w6, w7, w8 = (
        symbols[f"W{rank}"] for rank in range(3, 9)
    )
    literal_q = sp.expand(
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )
    assert sp.expand(reduced - literal_q) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Every connected degree-two-free 26-vertex tree W with maximum "
            "degree at least four and at least three branching vertices has "
            "strictly positive rank-seven common0/sum0 no-parent G1."
        ),
        "gapless_core_leaf_parameterization": {
            "argument": (
                "Delete all leaves of W. Since W has no degree-two vertices, "
                "the remaining branching vertices induce a connected tree K. "
                "Every deleted vertex is a leaf attached to one vertex of K. "
                "Conversely, a core tree K plus nonnegative leaf counts that "
                "make every core degree at least three reconstructs every "
                "such W. From leaves>=branching+2, the branching order is "
                "between 3 and 12."
            ),
            "unlabeled_core_orders": [3, 12],
            "unlabeled_core_counts": {
                order: raw["by_core_order"][order]["unlabeled_cores"]
                for order in sorted(raw["by_core_order"], key=int)
            },
            "ordered_leaf_assignments": raw["ordered_leaf_assignments"],
            "eligible_assignments": raw["eligible_assignments"],
            "duplicate_policy": (
                "Leaf assignments are ordered on each canonical core. Core "
                "automorphisms may duplicate an isomorphism class but cannot "
                "omit one, so zero negatives proves the stated universal "
                "scope without requiring orbit reduction."
            ),
            "coverage_gap": None,
        },
        "exact_evaluation": {
            "method": (
                "For each core/leaf assignment, exact rooted polynomial DP "
                "computes I_W through rank eight, followed by the literal G1 "
                "quadratic independently re-derived from the pinned parent "
                "algebra."
            ),
            "negative": raw["negative"],
            "minimum": raw["minimum"],
            "independent_explicit_26_vertex_DP_crosschecks": raw[
                "independent_full_tree_crosschecks"
            ],
            "ordered_certificate_stream_sha256": raw[
                "ordered_certificate_stream_sha256"
            ],
        },
        "coverage_gap_within_stated_n26_degree2free_scope": None,
        "remaining_G1_scope_after_combining_degree2_lane": (
            "No order-26 tree remains in this connected high-degree "
            "common0/sum0 no-parent cell. Orders 27..31 remain open."
        ),
        "scope_guard": (
            "This theorem covers only degree-two-free order-26 actual trees "
            "in the stated rank-seven G1 cell. The separate frozen "
            "subdivision theorem covers the complementary degree-two lane."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "order": 26,
        "degree_two_free_lane": "proved exact",
        "eligible_assignments": raw["eligible_assignments"],
        "negative": raw["negative"],
        "minimum_G1": raw["minimum"]["value"],
        "coverage_gap_within_stated_n26_degree2free_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
