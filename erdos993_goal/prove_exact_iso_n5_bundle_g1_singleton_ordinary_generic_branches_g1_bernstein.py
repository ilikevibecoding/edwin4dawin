#!/usr/bin/env python3
"""Exact all-order simplex certificates for 119 generic singleton-g1 rows.

The exhaustive canonical truth table has 136 u/v-symmetry-reduced rows.  This
source certifies every row except the explicitly routed sets handled by three
separate exact theorems: three common-boundary faces, ten selected-edge rows,
and four structurally empty cycle rows.  The order slack N=n-14 is retained
coefficientwise, so every passing row is an all-order n>=14 certificate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein import derive
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein import (
    branch_key,
    canonical_branches,
)
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients_fast,
    mapped_polynomial,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_generic_branches_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_GENERIC_BRANCHES_G1_BERNSTEIN"
DEPENDENCIES = (
    "derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein.py",
    "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py",
    "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein.py",
)

COMMON_FACE_INDICES = {55, 64, 65}
SELECTED_EDGE_INDICES = {70, 72, 76, 82, 94, 96, 106, 112, 124, 130}
EMPTY_CYCLE_INDICES = {97, 99, 102, 104}
ROUTED_INDICES = COMMON_FACE_INDICES | SELECTED_EDGE_INDICES | EMPTY_CYCLE_INDICES


def main() -> None:
    branches = canonical_branches()
    assert len(branches) == 136 and len(set(branches)) == 136
    assert len(ROUTED_INDICES) == 17
    expected_routed_keys = {
        55: "111/000/01/LL/1/P/full",
        64: "111/000/11/LL/0/P/full",
        65: "111/000/11/LL/1/P/full",
        70: "111/001/00/LL/0/P/full",
        72: "111/001/00/LL/1/P/full",
        76: "111/001/00/LU/1/P/full",
        82: "111/001/00/UL/1/P/full",
        94: "111/001/00/ZZ/0/P/full",
        96: "111/001/10/LL/0/P/full",
        97: "111/001/10/LL/1/P/full",
        99: "111/001/10/LU/1/P/full",
        102: "111/001/10/UL/1/P/full",
        104: "111/001/10/UU/1/P/full",
        106: "111/011/00/LL/1/P/full",
        112: "111/100/00/LL/0/P/full",
        124: "111/100/01/LL/0/P/full",
        130: "111/101/10/LL/0/P/full",
    }
    assert {
        index: branch_key(branches[index]) for index in sorted(ROUTED_INDICES)
    } == expected_routed_keys

    numerator = sp.expand(sp.fraction(derive()["strong_parent_cone_before_common"])[0])
    rows = []
    for progress, (index, branch) in enumerate(
        (row for row in enumerate(branches) if row[0] not in ROUTED_INDICES),
        start=1,
    ):
        (
            degrees, adjacency, common, endpoints, uv_common, parent_state,
            positive_parent_interval,
        ) = branch
        polynomial, _variables = mapped_polynomial(
            degrees, adjacency, common, endpoints,
            "centers", 1, 0, 0, uv_common, 14, numerator=numerator,
            parent_state=parent_state,
            positive_parent_interval=positive_parent_interval,
        )
        attempts = []
        passed = False
        for elevation in range(11):
            coefficients, stats = homogeneous_coefficients_fast(
                polynomial, elevation, elevation
            )
            negative = sum(value < 0 for value in coefficients.values())
            attempts.append({
                "elevation": elevation,
                **stats,
                "negative": int(negative),
                "minimum": str(min(coefficients.values())),
            })
            if not negative:
                passed = True
                break
        if not passed:
            raise AssertionError(
                "uncertified generic canonical branch", index,
                branch_key(branch), attempts[-1],
            )
        row = {
            "index": index,
            "branch": branch_key(branch),
            "passing_elevation": attempts[-1]["elevation"],
            "statistics": attempts[-1],
        }
        rows.append(row)
        print(json.dumps({
            "progress": f"{progress}/119", **row,
        }, sort_keys=True), flush=True)

    assert len(rows) == 119
    assert {row["index"] for row in rows} == set(range(136)) - ROUTED_INDICES
    report = {
        "marker": MARKER,
        "theorem": (
            "The strong singleton-ordinary parent-cone numerator is "
            "nonnegative for every n>=14 in all 119 generic canonical rows."
        ),
        "canonical_branch_total": len(branches),
        "generic_branch_count": len(rows),
        "routed_branch_count": len(ROUTED_INDICES),
        "routed_indices": {
            "common_faces": sorted(COMMON_FACE_INDICES),
            "selected_edges": sorted(SELECTED_EDGE_INDICES),
            "empty_cycles": sorted(EMPTY_CYCLE_INDICES),
        },
        "routed_keys": expected_routed_keys,
        "order_base": 14,
        "order_slack": "N=n-14>=0 retained coefficientwise",
        "maximum_elevation": 10,
        "rows": rows,
        "scope": (
            "Exact n>=14 theorem for the 119 displayed generic canonical "
            "singleton-ordinary g1 rows only. Routed rows and finite orders "
            "are separate; no all-N5 or Problem 993 claim."
        ),
        "dependencies_sha256": {
            name: hashlib.sha256((HERE / name).read_bytes()).hexdigest().upper()
            for name in DEPENDENCIES
        },
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "output": OUTPUT.name,
        "generic_branch_count": len(rows),
        "maximum_passing_elevation": max(row["passing_elevation"] for row in rows),
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
