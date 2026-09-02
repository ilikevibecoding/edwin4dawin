#!/usr/bin/env python3
"""Exact large-order componentwise-deletion cones for unique sum14."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum12_ratio_cone_root import homogeneous_simplex
from probe_iso_n5_disconnected_m5_sum14_ratio_cone_root import sum14_lower_bound
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import P, tensor_bernstein


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM14_COMPONENTWISE_RATIO_ROOT"
ORDER_BASE = 13


def build_sector(sector, q0=False):
    (n, s, q), bound = sum14_lower_bound()
    rho1, rho2, rho3, rho4, rho5 = sp.symbols("rho1:6", nonnegative=True)
    product = 1
    p_substitutions = {}
    for rank, rho in zip(range(2, 7), (rho1, rho2, rho3, rho4, rho5)):
        product *= rho
        p_substitutions[P[rank]] = n * product / (2 ** (rank - 1) * sp.factorial(rank))

    r, u, v, w, alpha, t = sp.symbols("r u v w alpha t", nonnegative=True)
    y = sp.symbols(f"{sector}_{'q0' if q0 else 'positive'}_y0:4", nonnegative=True)
    components = 1 + r * (n - 1)
    edges = n - components
    if q0:
        s_value = sp.Integer(0)
        q_value = sp.Integer(0)
    else:
        s_value = 1 + u * (components - 1)
        q_value = v * edges

    rho1_value = 2 * n - 6 + 4 * components / n
    rho5_value = 2 * (n - 5) * w
    remaining = rho1_value - 4 - rho5_value
    rho4_value = rho5_value + 1 + remaining * y[0]
    rho3_value = rho4_value + 1 + remaining * y[1]
    if sector == "high":
        rho2_value = rho3_value + 1 + remaining * y[2]
        rho1_rebuilt = rho2_value + 1 + remaining * y[3]
        cubes = (r, w) if q0 else (r, u, v, w)
    else:
        rho2_value = rho3_value + 2 - alpha + remaining * y[2]
        rho1_rebuilt = rho2_value + alpha + remaining * y[3]
        cubes = (r, w, alpha) if q0 else (r, u, v, w, alpha)
    assert sp.factor(rho1_rebuilt - rho1_value - remaining * (sum(y) - 1)) == 0

    rational = sp.cancel(sp.expand(bound.subs(p_substitutions)).subs({
        s: s_value,
        q: q_value,
        rho1: rho1_value,
        rho2: rho2_value,
        rho3: rho3_value,
        rho4: rho4_value,
        rho5: rho5_value,
    }))
    numerator, denominator = sp.fraction(rational)
    shifted = sp.expand(numerator.subs(n, t + ORDER_BASE))
    cube_rows = tensor_bernstein(shifted, cubes)
    audits = [homogeneous_simplex(row, y, t)[1] for row in cube_rows]
    return {
        "sector": sector,
        "branch": "q0" if q0 else "positive_s",
        "denominator": str(sp.factor(denominator)),
        "cube_variables": [str(variable) for variable in cubes],
        "cube_rows": len(cube_rows),
        "simplex_variables": len(y),
        "simplex_terms": sum(row["terms"] for row in audits),
        "negative": sum(row["negative"] for row in audits),
        "zero": sum(row["zero"] for row in audits),
        "minimum": str(min(row["minimum"] for row in audits)),
        "row_audits": audits,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector", choices=("high", "low"), required=True)
    parser.add_argument("--branch", choices=("positive", "q0"), required=True)
    args = parser.parse_args()
    result = build_sector(args.sector, q0=args.branch == "q0")
    report = {
        "marker": MARKER,
        "geometry": (
            "n=|P|, c=components(P)=1+r(n-1), e(P)=n-c; for positive "
            "deletion s=1+u(c-1), q=v(n-c); q0 has s=q=0 and P=H"
        ),
        "order_base": ORDER_BASE,
        **result,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        f"iso_n5_disconnected_m5_sum14_componentwise_{args.branch}_{args.sector}_ratio_probe_root_20260830.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: report[key] for key in (
        "marker", "branch", "sector", "denominator", "cube_rows", "simplex_terms",
        "negative", "zero", "minimum",
    )}, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
