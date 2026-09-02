#!/usr/bin/env python3
"""Exact ordinary-parent probe for rank-seven G1 on matching sum-zero cores."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g1_sum0_matching_rank7_g4_piecewise import (
    matching_row,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_matching_ordinary_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_MATCHING_ORDINARY_RANK7_G4_PIECEWISE"
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
    m, tail, edge_parameter = sp.symbols(
        "m tail edge_parameter", nonnegative=True
    )

    cases = {
        "ordinary_parent_is_isolate": (m-1, sp.Integer(0)),
        "ordinary_parent_is_matched": (m-2, sp.Integer(1)),
    }
    summaries = {}
    exact_values = {}
    for label, (free_capacity, offset) in cases.items():
        edge = offset+free_capacity*edge_parameter/2
        rows = {rank: matching_row(m, edge, rank) for rank in range(9)}
        if label.endswith("is_isolate"):
            contains = {
                rank: matching_row(m-1, edge, rank-1) for rank in range(1, 8)
            }
        else:
            contains = {
                rank: matching_row(m-2, edge-1, rank-1) for rank in range(1, 8)
            }
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
        summaries[label] = fast_summary(shifted, (edge_parameter,), tail)
        exact_values[label] = str(value)

    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "core": "matching plus isolates",
        "mode": "ordinary_parent",
        "threshold_n": THRESHOLD_M+2,
        "cases": {
            "ordinary_parent_is_isolate": (
                "0<=t<=(m-1)/2; containing-p rows are matching(m-1,t)."
            ),
            "ordinary_parent_is_matched": (
                "1<=t<=m/2; containing-p rows are matching(m-2,t-1)."
            ),
        },
        "expressions": exact_values,
        "summaries": summaries,
        "negative_counts": {
            key: value["negative_tail_scalar_coefficients"]
            for key, value in summaries.items()
        },
        "status": "diagnostic exact specialization; no theorem asserted",
        "scope": (
            "Rank-seven G1, common0/sum0 matching W, ordinary parent, n>=11."
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
