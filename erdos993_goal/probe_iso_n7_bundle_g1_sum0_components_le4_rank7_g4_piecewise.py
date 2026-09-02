#!/usr/bin/env python3
"""Exact G1 probe for isolated marks over forest components of order <=4."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_components_le4_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_COMPONENTS_LE4_RANK7_G4_PIECEWISE"
THRESHOLD_M = 9
MAXIMUM = 8


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k < 0:
        return sp.Integer(0)
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h-j for j in range(k))/sp.factorial(k)


def component_power(count, coefficients, maximum=MAXIMUM):
    """Coefficients through maximum of (1+sum c_d x^d)^count."""
    degrees = tuple(sorted(coefficients))
    result = [sp.Integer(0)]*(maximum+1)
    ranges = [range(maximum//degree+1) for degree in degrees]
    for occupancies in itertools.product(*ranges):
        rank = sum(degree*amount for degree, amount in zip(degrees, occupancies))
        if rank > maximum:
            continue
        remaining = count
        ways = sp.Integer(1)
        for degree, amount in zip(degrees, occupancies):
            ways *= choose(remaining, amount)*coefficients[degree]**amount
            remaining -= amount
        result[rank] += ways
    return list(map(sp.expand, result))


def component_rows(isolates, edges, p3, p4, star4, maximum=MAXIMUM):
    types = (
        (isolates, {1: 1}),
        (edges, {1: 2}),
        (p3, {1: 3, 2: 1}),
        (p4, {1: 4, 2: 3}),
        (star4, {1: 4, 2: 3, 3: 1}),
    )
    total = [sp.Integer(1)]+[sp.Integer(0)]*maximum
    for count, coefficients in types:
        factor = component_power(count, coefficients, maximum)
        total = [
            sp.expand(sum(total[j]*factor[rank-j] for j in range(rank+1)))
            for rank in range(maximum+1)
        ]
    return {rank: total[rank] for rank in range(maximum+1)}


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

    m, tail, component4_parameter, star_split, p3_parameter, edge_parameter = sp.symbols(
        "m tail component4_parameter star_split p3_parameter edge_parameter",
        nonnegative=True,
    )
    total4 = m*component4_parameter/4
    star4 = total4*star_split
    p4 = total4*(1-star_split)
    remainder = m-4*total4
    p3 = remainder*p3_parameter/3
    remainder2 = remainder-3*p3
    edges = remainder2*edge_parameter/2
    isolates = remainder2-2*edges
    rows = component_rows(isolates, edges, p3, p4, star4)
    substitutions = {W[k]: rows[k] for k in range(3, 9)}
    variables = (
        component4_parameter, star_split, p3_parameter, edge_parameter,
    )
    summaries = {}
    values = {}
    for mode in ("no_parent", "endpoint_u"):
        value = sp.factor(reduced[mode].subs(substitutions, simultaneous=True))
        shifted = sp.cancel(value.subs(m, tail+THRESHOLD_M))
        print("MODE_START", mode, flush=True)
        summaries[mode] = fast_summary(shifted, variables, tail)
        values[mode] = str(value)

    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "core": "components K1, K2, P3, P4, and K1,3 only",
        "threshold_n": THRESHOLD_M+2,
        "parameterization": {
            "total_order4_components": str(total4),
            "star4_components": str(star4),
            "path4_components": str(p4),
            "P3_components": str(p3),
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
            "Rank-seven G1, common0/sum0, W components of order <=4, "
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
