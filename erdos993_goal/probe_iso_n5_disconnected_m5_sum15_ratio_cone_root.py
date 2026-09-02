#!/usr/bin/env python3
"""Exact sparse/dense high/low ratio-cone probe for unique Psi sum 15."""

from __future__ import annotations

import argparse
import hashlib
import itertools
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
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_RATIO_CONE_ROOT"


def sum15_lower_bound(use_auxiliary_d3=False, use_extension_d4=False):
    expressions = unique_expressions(interval_cells(P, H))
    deletion = deletion_difference_bounds(expressions)
    n, s, q = deletion["symbols"]
    d = sp.symbols("d0:7", nonnegative=True)
    expression = sp.expand(expressions[14].subs({
        P[0]: 1,
        H[0]: 1,
        P[1]: n,
        **{H[index]: P[index] - d[index] for index in range(1, 7)},
    }))
    d4_lower = (
        choose(s, 4) + choose(s, 3) * (n - s)
        - choose(s - 1, 2) * q
    )
    mean_degree = q / s
    extension_d4_lower = s * (
        choose(n - 1 - mean_degree, 3)
        - (n - s - mean_degree) * (n - 3 - mean_degree)
    ) / 4
    bound = sp.expand(expression.subs({
        d[1]: s,
        d[2]: deletion["d2"],
        d[3]: deletion["d3_upper"] if use_auxiliary_d3 else P[3],
        d[4]: extension_d4_lower if use_extension_d4 else d4_lower,
    }))
    assert sp.diff(expression, d[1]) == -P[2] / 2 + 5 * P[4] / 2
    assert sp.diff(expression, d[2]) == -n / 2 - 3 * P[3] / 2
    assert sp.diff(expression, d[3]) == -3 * P[2] / 2
    assert sp.diff(expression, d[4]) == 5 * n / 2
    assert sp.diff(expression, d[5]) == 0
    assert sp.diff(expression, d[6]) == 0
    return (n, s, q), bound


def build_sector(sector, branch):
    use_auxiliary_d3 = False
    use_extension_d4 = True
    (n, s, q), bound = sum15_lower_bound(
        use_auxiliary_d3, use_extension_d4
    )
    rho1, rho2, rho3, rho4 = sp.symbols("rho1:5", nonnegative=True)
    p_substitutions = {}
    product = 1
    for rank, rho in zip(range(2, 6), (rho1, rho2, rho3, rho4)):
        product *= rho
        p_substitutions[P[rank]] = (
            n * product / (2 ** (rank - 1) * sp.factorial(rank))
        )

    r, v, w, a, t = sp.symbols("r v w a t", nonnegative=True)
    if branch == "sparse":
        s_value = 4 + r * (n / 4 - 4)
        q_value = 2 + v * (n - s_value - 3)
        y = sp.symbols(f"{branch}_{sector}_y0:4", nonnegative=True)
    else:
        s_value = n / 4 + 3 * n * r / 4
        q_value = v * (n - s_value)
        y = sp.symbols(f"{branch}_{sector}_y0:3", nonnegative=True)
    rho1_value = 2 * n - 6 + 4 * s_value / n
    budget = rho1_value - 3
    if branch == "sparse":
        rho4_value = budget * y[0]
        remaining = budget
        rho3_value = rho4_value + 1 + remaining * y[1]
        if sector == "high":
            rho2_value = rho3_value + 1 + remaining * y[2]
            d1_slack = remaining * y[3]
            assert sp.factor(
                rho1_value - rho2_value - 1 - d1_slack
                - budget * (1 - sum(y))
            ) == 0
            cube_variables = (r, v)
        else:
            rho2_value = rho3_value + 2 - a + remaining * y[2]
            d1_slack = remaining * y[3]
            assert sp.factor(
                rho1_value - rho2_value - a - d1_slack
                - budget * (1 - sum(y))
            ) == 0
            cube_variables = (r, v, a)
    else:
        rho4_value = 2 * (n - 4) * w
        remaining = budget - rho4_value
        rho3_value = rho4_value + 1 + remaining * y[0]
        if sector == "high":
            rho2_value = rho3_value + 1 + remaining * y[1]
            d1_slack = remaining * y[2]
            assert sp.factor(
                rho1_value - rho2_value - 1 - d1_slack
                - remaining * (1 - sum(y))
            ) == 0
            cube_variables = (r, v, w)
        else:
            rho2_value = rho3_value + 2 - a + remaining * y[1]
            d1_slack = remaining * y[2]
            assert sp.factor(
                rho1_value - rho2_value - a - d1_slack
                - remaining * (1 - sum(y))
            ) == 0
            cube_variables = (r, v, w, a)

    ratio_bound = sp.expand(bound.subs(p_substitutions))
    rational = sp.cancel(ratio_bound.subs({
        s: s_value,
        q: q_value,
        rho1: rho1_value,
        rho2: rho2_value,
        rho3: rho3_value,
        rho4: rho4_value,
    }))
    corner_failures = []
    corner_minimum = None
    for order in (13, 20, 40, 100):
        for cube_corner in itertools.product((0, 1), repeat=len(cube_variables)):
            for chosen in y:
                simplex_corner = {
                    variable: int(variable == chosen) for variable in y
                }
                value = sp.factor(rational.subs({
                    n: order,
                    **dict(zip(cube_variables, cube_corner)),
                    **simplex_corner,
                }))
                corner_minimum = (
                    value if corner_minimum is None else min(corner_minimum, value)
                )
                if value < 0:
                    corner_failures.append({
                        "order": order,
                        "cube": cube_corner,
                        "simplex_vertex": str(chosen),
                        "value": str(value),
                    })
    numerator, denominator = sp.fraction(rational)
    denominator = sp.factor(denominator)
    shifted = sp.expand(numerator.subs(n, t + 16))
    cube_rows = tensor_bernstein(shifted, cube_variables)
    audits = [homogeneous_simplex(row, y, t)[1] for row in cube_rows]
    return {
        "sector": sector,
        "branch": branch,
        "d3_cap": (
            "active-root auxiliary upper bound" if use_auxiliary_d3 else "d3<=p3"
        ),
        "d4_floor": (
            "s*f(q/s)/4 by Jensen, where f(d)=binom(n-1-d,3)-(n-s-d)(n-3-d)"
            if use_extension_d4
            else "selected-set three/four-point floor"
        ),
        "q_parameterization": (
            "q=2+v(n-s-3), interior 2<=q<=e(P)-1"
            if branch == "sparse" else "q=v(n-s)"
        ),
        "denominator": str(denominator),
        "cube_variables": [str(variable) for variable in cube_variables],
        "cube_rows": len(cube_rows),
        "simplex_variables": len(y),
        "simplex_terms": sum(row["terms"] for row in audits),
        "negative": sum(row["negative"] for row in audits),
        "zero": sum(row["zero"] for row in audits),
        "minimum": str(min(row["minimum"] for row in audits)),
        "sample_corner_negative": len(corner_failures),
        "sample_corner_minimum": str(corner_minimum),
        "sample_corner_failures": corner_failures,
        "row_audits": audits,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector", choices=("high", "low"), required=True)
    parser.add_argument("--branch", choices=("sparse", "dense"), required=True)
    args = parser.parse_args()
    result = build_sector(args.sector, args.branch)
    report = {
        "marker": MARKER,
        **result,
        "status": "one exact relaxation cone only; no theorem claim",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        f"iso_n5_disconnected_m5_sum15_ratio_cone_{args.branch}_"
        f"{args.sector}_root_20260830.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: report[key] for key in (
        "marker", "sector", "branch", "denominator", "cube_rows",
        "simplex_terms", "negative", "zero", "minimum",
        "sample_corner_negative", "sample_corner_minimum", "status",
    )}, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
