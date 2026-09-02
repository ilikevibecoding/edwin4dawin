#!/usr/bin/env python3
"""Ordinary-parent G1 probe for isolated marks over K1/K2/P3 cores."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g1_sum0_components_le3_rank7_g4_piecewise import (
    component_row,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_components_le3_ordinary_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_COMPONENTS_LE3_ORDINARY_RANK7_G4_PIECEWISE"
THRESHOLD_M = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    m, tail, wedge_parameter, edge_parameter = sp.symbols(
        "m tail wedge_parameter edge_parameter", nonnegative=True
    )
    cases = {}

    # Reserve the ordinary parent component, then parameterize all remaining
    # vertices by the same exact simplex map.
    available = m-1
    s = available*wedge_parameter/3
    t = (available-3*s)*edge_parameter/2
    r = m-3*s-2*t
    cases["ordinary_parent_is_isolate"] = (
        r, t, s, (r-1, t, s)
    )

    available = m-2
    s = available*wedge_parameter/3
    t = 1+(available-3*s)*edge_parameter/2
    r = m-3*s-2*t
    cases["ordinary_parent_is_K2_endpoint"] = (
        r, t, s, (r, t-1, s)
    )

    available = m-3
    s = 1+available*wedge_parameter/3
    t = (available-3*(s-1))*edge_parameter/2
    r = m-3*s-2*t
    cases["ordinary_parent_is_P3_center"] = (
        r, t, s, (r, t, s-1)
    )
    cases["ordinary_parent_is_P3_leaf"] = (
        r, t, s, (r+1, t, s-1)
    )

    summaries = {}
    exact_values = {}
    for label, (r, t, s, deletion_core) in cases.items():
        rows = {rank: component_row(r, t, s, rank) for rank in range(9)}
        dr, dt, ds = deletion_core
        deletion = {
            rank: component_row(dr, dt, ds, rank) for rank in range(8)
        }
        # Independent sets containing p are x times the independence
        # polynomial of W-N[p], which is the displayed deletion core.
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
        summaries[label] = fast_summary(
            shifted, (wedge_parameter, edge_parameter), tail
        )
        exact_values[label] = str(value)

    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "core": "components K1, K2, and P3 only",
        "mode": "ordinary_parent",
        "threshold_n": THRESHOLD_M+2,
        "cases": list(cases),
        "expressions": exact_values,
        "summaries": summaries,
        "negative_counts": {
            key: value["negative_tail_scalar_coefficients"]
            for key, value in summaries.items()
        },
        "status": "diagnostic exact specialization; no theorem asserted",
        "scope": (
            "Rank-seven G1, common0/sum0, W components of order <=3, "
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
