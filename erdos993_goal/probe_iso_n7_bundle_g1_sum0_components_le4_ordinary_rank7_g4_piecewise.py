#!/usr/bin/env python3
"""Ordinary-parent G1 probe for isolated marks over forest components <=4."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g1_sum0_components_le4_rank7_g4_piecewise import (
    component_rows,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_components_le4_ordinary_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_COMPONENTS_LE4_ORDINARY_RANK7_G4_PIECEWISE"
THRESHOLD_M = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left, right):
    return tuple(a+b for a, b in zip(left, right))


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    symbols.update({
        f"P{family}{rank}": sp.Symbol(f"P{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(3, 8)
    })
    expression = sp.expand(sp.sympify(
        source["modes"]["ordinary_parent"]["expression"], locals=symbols
    ))
    m, tail, component4_parameter, star_split, p3_parameter, edge_parameter = sp.symbols(
        "m tail component4_parameter star_split p3_parameter edge_parameter",
        nonnegative=True,
    )
    variables = (
        component4_parameter, star_split, p3_parameter, edge_parameter,
    )

    def allocation(available):
        total4 = available*component4_parameter/4
        star4 = total4*star_split
        p4 = total4*(1-star_split)
        remainder = available-4*total4
        p3 = remainder*p3_parameter/3
        remainder2 = remainder-3*p3
        edges = remainder2*edge_parameter/2
        isolates = remainder2-2*edges
        return (isolates, edges, p3, p4, star4)

    # Tuple coordinate order: K1,K2,P3,P4,K1,3.  The second delta gives the
    # component multiset of W-N[p], used for sets containing p.
    specifications = {
        "ordinary_parent_is_K1": (1, (1,0,0,0,0), (-1,0,0,0,0)),
        "ordinary_parent_is_K2_endpoint": (2, (0,1,0,0,0), (0,-1,0,0,0)),
        "ordinary_parent_is_P3_center": (3, (0,0,1,0,0), (0,0,-1,0,0)),
        "ordinary_parent_is_P3_leaf": (3, (0,0,1,0,0), (1,0,-1,0,0)),
        "ordinary_parent_is_P4_endpoint": (4, (0,0,0,1,0), (0,1,0,-1,0)),
        "ordinary_parent_is_P4_internal": (4, (0,0,0,1,0), (1,0,0,-1,0)),
        "ordinary_parent_is_K13_center": (4, (0,0,0,0,1), (0,0,0,0,-1)),
        "ordinary_parent_is_K13_leaf": (4, (0,0,0,0,1), (2,0,0,0,-1)),
    }
    summaries = {}
    exact_values = {}
    for label, (reserved_order, reserve, neighborhood_delta) in specifications.items():
        counts = add(allocation(m-reserved_order), reserve)
        contains_core = add(counts, neighborhood_delta)
        rows = component_rows(*counts)
        deletion = component_rows(*contains_core, maximum=7)
        contains = {rank: deletion[rank-1] for rank in range(1, 8)}
        substitutions = {}
        for rank in range(2, 9):
            substitutions.update({
                symbols[f"W{rank}"]: rows[rank],
                symbols[f"A{rank}"]: rows[rank-1],
                symbols[f"B{rank}"]: rows[rank-1],
                symbols[f"Z{rank}"]: rows[rank-2],
            })
        for rank in range(3, 8):
            substitutions.update({
                symbols[f"PW{rank}"]: contains[rank],
                symbols[f"PA{rank}"]: contains[rank-1],
                symbols[f"PB{rank}"]: contains[rank-1],
                symbols[f"PZ{rank}"]: contains[rank-2],
            })
        value = sp.factor(expression.subs(substitutions, simultaneous=True))
        shifted = sp.cancel(value.subs(m, tail+THRESHOLD_M))
        print("CASE_START", label, flush=True)
        summaries[label] = fast_summary(shifted, variables, tail)
        exact_values[label] = str(value)

    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "core": "components K1, K2, P3, P4, and K1,3 only",
        "mode": "ordinary_parent",
        "threshold_n": THRESHOLD_M+2,
        "cases": list(specifications),
        "expressions": exact_values,
        "summaries": summaries,
        "negative_counts": {
            key: value["negative_tail_scalar_coefficients"]
            for key, value in summaries.items()
        },
        "status": "diagnostic exact specialization; no theorem asserted",
        "scope": (
            "Rank-seven G1, common0/sum0, W components of order <=4, "
            "ordinary-parent mode, n>=11."
        ),
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_counts": report["negative_counts"],
        "minima": {
            key: value["minimum_tail_scalar_coefficient"]
            for key, value in summaries.items()
        },
        "degrees": {
            key: value["degree_profile"] for key, value in summaries.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
