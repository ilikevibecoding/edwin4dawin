#!/usr/bin/env python3
"""Exact matching-core probe for rank-seven G1 sum-zero geometry.

W is a disjoint union of t edges and m-2t isolates.  Its independent rows are
computed exactly and the full interval 0<=t<=m/2 is relaxed to one Bernstein
parameter.  No theorem is asserted by this probe.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_matching_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_MATCHING_RANK7_G4_PIECEWISE"
THRESHOLD_M = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k < 0:
        return sp.Integer(0)
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h-j for j in range(k))/sp.factorial(k)


def matching_row(m, edges, rank):
    return sp.expand(sum(
        choose(edges, selected_edges)*2**selected_edges
        * choose(m-2*edges, rank-selected_edges)
        for selected_edges in range(rank+1)
    ))


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

    m, tail, edge_parameter = sp.symbols(
        "m tail edge_parameter", nonnegative=True
    )
    edge = m*edge_parameter/2
    row_substitution = {
        W[k]: matching_row(m, edge, k) for k in range(3, 9)
    }
    summaries = {}
    values = {}
    for mode in ("no_parent", "endpoint_u"):
        value = sp.factor(reduced[mode].subs(row_substitution, simultaneous=True))
        shifted = sp.cancel(value.subs(m, tail+THRESHOLD_M))
        summaries[mode] = fast_summary(shifted, (edge_parameter,), tail)
        values[mode] = str(value)

    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "core": "matching plus isolates",
        "threshold_n": THRESHOLD_M+2,
        "exact_matching_rows": {
            f"W{k}": str(row_substitution[W[k]]) for k in range(3, 9)
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
            "Rank-seven G1, common0/sum0 matching W, no-parent and endpoint "
            "parent modes, n>=11. Ordinary parent not covered."
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
