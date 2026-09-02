#!/usr/bin/env python3
"""Exact G1 probe for isolated marks over forest components of order at most 3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_components_le3_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_COMPONENTS_LE3_RANK7_G4_PIECEWISE"
THRESHOLD_M = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k < 0:
        return sp.Integer(0)
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h-j for j in range(k))/sp.factorial(k)


def component_row(isolates, edges, wedges, rank):
    """Coefficient of (1+x)^r(1+2x)^t(1+3x+x^2)^s."""
    value = sp.Integer(0)
    for pairs in range(rank//2+1):
        for singles in range(rank-2*pairs+1):
            for edge_singles in range(rank-2*pairs-singles+1):
                isolate_singles = rank-2*pairs-singles-edge_singles
                value += (
                    choose(wedges, pairs)
                    * choose(wedges-pairs, singles)*3**singles
                    * choose(edges, edge_singles)*2**edge_singles
                    * choose(isolates, isolate_singles)
                )
    return sp.expand(value)


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    W = {k: symbols[f"W{k}"] for k in range(3, 9)}
    shifts = {symbols[f"A{k}"]: W[k-1] for k in range(4, 9)}
    shifts.update({symbols[f"B{k}"]: W[k-1] for k in range(4, 9)})
    shifts.update({symbols[f"Z{k}"]: W[k-2] for k in range(5, 9)})
    reduced = {}
    for mode in ("no_parent", "endpoint_u", "endpoint_v"):
        expression = sp.expand(sp.sympify(
            source["modes"][mode]["expression"], locals=symbols
        ))
        reduced[mode] = sp.factor(expression.subs(shifts, simultaneous=True))
    assert sp.expand(reduced["endpoint_u"]-reduced["endpoint_v"]) == 0

    m, tail, wedge_parameter, edge_parameter = sp.symbols(
        "m tail wedge_parameter edge_parameter", nonnegative=True
    )
    wedges = m*wedge_parameter/3
    edges = (m-3*wedges)*edge_parameter/2
    isolates = m-3*wedges-2*edges
    rows = {
        k: component_row(isolates, edges, wedges, k) for k in range(3, 9)
    }
    substitutions = {W[k]: rows[k] for k in range(3, 9)}
    summaries = {}
    values = {}
    for mode in ("no_parent", "endpoint_u"):
        value = sp.factor(reduced[mode].subs(substitutions, simultaneous=True))
        shifted = sp.cancel(value.subs(m, tail+THRESHOLD_M))
        summaries[mode] = fast_summary(
            shifted, (wedge_parameter, edge_parameter), tail
        )
        values[mode] = str(value)

    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "core": "components K1, K2, and P3 only",
        "threshold_n": THRESHOLD_M+2,
        "parameterization": {
            "P3_components": str(wedges),
            "K2_components": str(edges),
            "K1_components": str(isolates),
        },
        "expressions": values,
        "summaries": summaries,
        "negative_counts": {
            key: value["negative_tail_scalar_coefficients"]
            for key, value in summaries.items()
        },
        "endpoint_v_by_symmetry": True,
        "status": "diagnostic exact specialization; no theorem asserted",
        "scope": (
            "Rank-seven G1, common0/sum0, W components of order <=3, "
            "no-parent and endpoint modes, n>=11. Ordinary parent separate."
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
