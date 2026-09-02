#!/usr/bin/env python3
"""Exact all-order ratio-cone probe for disconnected unique Psi sum 14."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum12_ratio_cone_root import (
    choose,
    homogeneous_simplex,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    deletion_difference_bounds,
    interval_cells,
    tensor_bernstein,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM14_RATIO_CONE_ROOT"


def sum14_lower_bound():
    expressions = unique_expressions(interval_cells(P, H))
    deletion = deletion_difference_bounds(expressions)
    n, s, q = deletion["symbols"]
    d = sp.symbols("d0:7", nonnegative=True)
    expression = sp.expand(expressions[13].subs({
        P[0]: 1,
        H[0]: 1,
        P[1]: n,
        **{H[index]: P[index] - d[index] for index in range(1, 7)},
    }))
    d4_lower = (
        choose(s, 4) + choose(s, 3) * (n - s)
        - choose(s - 1, 2) * q
    )
    d5_lower = (
        choose(s, 5) + choose(s, 4) * (n - s)
        - choose(s - 1, 3) * q
    )
    bound = sp.expand(expression.subs({
        d[1]: s,
        d[2]: deletion["d2"],
        d[3]: P[3],
        d[4]: d4_lower,
        d[5]: d5_lower,
    }))
    assert sp.diff(expression, d[1]) == -P[2] + sp.Rational(3, 2) * P[4]
    assert sp.diff(expression, d[2]) == -n - sp.Rational(3, 2) * P[3]
    assert sp.diff(expression, d[3]) == -sp.Rational(3, 2) * P[2] - sp.Rational(1, 2)
    assert sp.diff(expression, d[4]) == sp.Rational(3, 2) * n
    assert sp.diff(expression, d[5]) == 3
    assert sp.diff(expression, d[6]) == 0
    return (n, s, q), bound


def build_sector(sector):
    (n, s, q), bound = sum14_lower_bound()
    rho1, rho2, rho3, rho4, rho5 = sp.symbols("rho1:6", nonnegative=True)
    p_substitutions = {}
    product = 1
    for rank, rho in zip(range(2, 7), (rho1, rho2, rho3, rho4, rho5)):
        product *= rho
        p_substitutions[P[rank]] = (
            n * product / (2 ** (rank - 1) * sp.factorial(rank))
        )

    r, v, w, a, t = sp.symbols("r v w a t", nonnegative=True)
    y = sp.symbols(f"{sector}_y0:4", nonnegative=True)
    s_value = 1 + r * (n - 1)
    rho1_value = 2 * n - 6 + 4 * s_value / n
    budget = rho1_value - 4
    rho5_value = 2 * (n - 5) * w
    remaining = budget - rho5_value
    rho4_value = rho5_value + 1 + remaining * y[0]
    rho3_value = rho4_value + 1 + remaining * y[1]
    if sector == "high":
        rho2_value = rho3_value + 1 + remaining * y[2]
        d1_slack = remaining * y[3]
        assert sp.factor(
            rho1_value - rho2_value - 1 - d1_slack
            - remaining * (1 - sum(y))
        ) == 0
        cube_variables = (r, v, w)
    else:
        rho2_value = rho3_value + 2 - a + remaining * y[2]
        d1_slack = remaining * y[3]
        assert sp.factor(
            rho1_value - rho2_value - a - d1_slack
            - remaining * (1 - sum(y))
        ) == 0
        cube_variables = (r, v, w, a)

    ratio_bound = sp.expand(bound.subs(p_substitutions))
    rational = sp.cancel(ratio_bound.subs({
        s: s_value,
        q: v * (n - s_value),
        rho1: rho1_value,
        rho2: rho2_value,
        rho3: rho3_value,
        rho4: rho4_value,
        rho5: rho5_value,
    }))
    numerator, denominator = sp.fraction(rational)
    denominator = sp.factor(denominator)
    shifted = sp.expand(numerator.subs(n, t + 13))
    cube_rows = tensor_bernstein(shifted, cube_variables)
    audits = [homogeneous_simplex(row, y, t)[1] for row in cube_rows]

    return {
        "sector": sector,
        "denominator": str(denominator),
        "cube_variables": [str(variable) for variable in cube_variables],
        "cube_rows": len(cube_rows),
        "simplex_variables": len(y),
        "simplex_terms": sum(row["terms"] for row in audits),
        "negative": sum(row["negative"] for row in audits),
        "zero": sum(row["zero"] for row in audits),
        "minimum": str(min(row["minimum"] for row in audits)),
        "sample_corner_negative": None,
        "sample_corner_minimum": "not run; exact coefficient audit is stronger",
        "sample_corner_failures": [],
        "row_audits": audits,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector", choices=("high", "low"), required=True)
    args = parser.parse_args()
    result = build_sector(args.sector)
    report = {
        "marker": MARKER,
        **result,
        "status": "one exact relaxation cone only; no theorem claim",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        f"iso_n5_disconnected_m5_sum14_ratio_cone_{args.sector}_root_20260830.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: report[key] for key in (
        "marker", "sector", "denominator", "cube_rows", "simplex_terms",
        "negative", "zero", "minimum", "sample_corner_negative",
        "sample_corner_minimum", "status",
    )}, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
