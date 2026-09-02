#!/usr/bin/env python3
"""Exact high/low ratio-cone probe for disconnected unique Psi sum 12.

This uses the active-root deletion identities, the rigorous upper bound for
d3, and the selected-set lower bound for d4.  The remaining forest row is
placed in the proved rank-five high/low factorial-drop cones.  Each run is a
single exact cone probe; no theorem is asserted unless both sectors pass and
the finite branch is assembled separately.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    P,
    H,
    deletion_difference_bounds,
    interval_cells,
    tensor_bernstein,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM12_RATIO_CONE_ROOT"


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def homogeneous_simplex(expression, simplex_variables, order_variable):
    polynomial = sp.Poly(sp.expand(expression), order_variable, *simplex_variables)
    degree = max(sum(monomial[1:]) for monomial, _ in polynomial.terms())
    simplex_sum = sum(simplex_variables)
    homogeneous = sp.Poly(sp.expand(sum(
        coefficient * order_variable**monomial[0]
        * sp.prod(variable**exponent for variable, exponent in zip(simplex_variables, monomial[1:]))
        * simplex_sum**(degree - sum(monomial[1:]))
        for monomial, coefficient in polynomial.terms()
    )), order_variable, *simplex_variables)
    coefficients = homogeneous.coeffs()
    ordered_payload = "\n".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in homogeneous.terms()
    ).encode()
    return homogeneous, {
        "degree": degree,
        "terms": len(homogeneous.terms()),
        "negative": sum(1 for coefficient in coefficients if coefficient < 0),
        "zero": sum(1 for coefficient in coefficients if coefficient == 0),
        "minimum": min(coefficients),
        "ordered_coefficient_hash": hashlib.sha256(ordered_payload).hexdigest().upper(),
    }


def sum12_lower_bound(use_trivial_d3_cap=False):
    expressions = unique_expressions(interval_cells(P, H))
    deletion = deletion_difference_bounds(expressions)
    n, s, q = deletion["symbols"]
    d = sp.symbols("d0:7", nonnegative=True)
    expression = sp.expand(expressions[11].subs({
        P[0]: 1,
        H[0]: 1,
        P[1]: n,
        **{H[index]: P[index] - d[index] for index in range(1, 6)},
    }))
    d4_lower = (
        choose(s, 4) + choose(s, 3) * (n - s)
        - choose(s - 1, 2) * q
    )
    bound = sp.expand(expression.subs({
        d[1]: s,
        d[2]: deletion["d2"],
        # Since d3=p3-h3, the universal cap d3<=p3 is especially sharp
        # when the marked transversal occupies a positive fraction of P.
        d[3]: P[3] if use_trivial_d3_cap else deletion["d3_upper"],
        d[4]: d4_lower,
    }))
    assert sp.diff(expression, d[1]) == -n - P[3]
    assert sp.diff(expression, d[2]) == -1
    assert sp.diff(expression, d[3]) == -n
    assert sp.diff(expression, d[4]) == 2
    return (n, s, q), bound


def build_sector(sector, branch):
    use_trivial_d3_cap = branch in ("sparse", "dense")
    (n, s, q), bound = sum12_lower_bound(use_trivial_d3_cap)
    rho1, rho2, rho3, rho4 = sp.symbols("rho1:5", nonnegative=True)
    p_substitutions = {
        P[2]: n * rho1 / 4,
        P[3]: n * rho1 * rho2 / 24,
        P[4]: n * rho1 * rho2 * rho3 / 192,
        P[5]: n * rho1 * rho2 * rho3 * rho4 / 1920,
    }
    r, v, a, t, w = sp.symbols("r v a t w", nonnegative=True)
    if branch == "loose":
        s_value = 1 + r * (n - 1)
    elif branch == "sparse":
        # Here s<=n/4, so the extension ceiling rho4<=2(n-4) is
        # weaker than the ordinary ratio budget rho4<=rho1-3.
        s_value = 1 + r * (n - 4) / 4
    else:
        # Here s>=n/4 and the extension ceiling is the active endpoint.
        s_value = n / 4 + 3 * n * r / 4
    # These are homogeneous barycentric coordinates: every actual ratio row
    # lies on sum(y)=1.  Keeping the final d1 slack explicit is essential;
    # treating it as an implicit simplex coordinate would not be certified by
    # the homogeneous coefficient audit below.
    y_count = 3 if branch == "dense" else 4
    y = sp.symbols(f"{sector}_y0:{y_count}", nonnegative=True)
    rho1_value = 2 * n - 6 + 4 * s_value / n
    budget = rho1_value - 3
    if branch == "dense":
        rho4_value = 2 * (n - 4) * w
        remaining = budget - rho4_value
        d3_slack = remaining * y[0]
    else:
        rho4_value = budget * y[0]
        remaining = budget
        d3_slack = budget * y[1]
    rho3_value = rho4_value + 1 + d3_slack
    if sector == "high":
        d2_slack = remaining * y[1] if branch == "dense" else budget * y[2]
        rho2_value = rho3_value + 1 + d2_slack
        if branch == "dense":
            d1_slack = remaining * y[2]
            assert sp.factor(
                rho1_value - rho2_value - 1 - d1_slack
                - remaining * (1 - sum(y))
            ) == 0
            cube_variables = (r, v, w)
        else:
            d1_slack = budget * y[3]
            assert sp.factor(
                rho1_value - rho2_value - 1 - d1_slack
                - budget * (1 - sum(y))
            ) == 0
            cube_variables = (r, v)
    else:
        d2_slack = remaining * y[1] if branch == "dense" else budget * y[2]
        rho2_value = rho3_value + 2 - a + d2_slack
        if branch == "dense":
            d1_slack = remaining * y[2]
            assert sp.factor(
                rho1_value - rho2_value - a - d1_slack
                - remaining * (1 - sum(y))
            ) == 0
            cube_variables = (r, v, w, a)
        else:
            d1_slack = budget * y[3]
            assert sp.factor(
                rho1_value - rho2_value - a - d1_slack
                - budget * (1 - sum(y))
            ) == 0
            cube_variables = (r, v, a)

    # First rewrite the forest row in ratio coordinates, then specialize the
    # ratio/geometry variables.  A single simultaneous substitution leaves
    # the rho symbols introduced by ``p_substitutions`` untouched.
    ratio_bound = sp.expand(bound.subs(p_substitutions))
    rational = sp.cancel(ratio_bound.subs({
        s: s_value,
        q: v * (n - s_value),
        rho1: rho1_value,
        rho2: rho2_value,
        rho3: rho3_value,
        rho4: rho4_value,
    }))
    corner_failures = []
    corner_minimum = None
    corner_witness = None
    simplex_corners = [
        {variable: int(variable == chosen) for variable in y}
        for chosen in y
    ]
    for order in (13, 20, 40, 100):
        for cube_corner in itertools.product((0, 1), repeat=len(cube_variables)):
            cube_substitution = dict(zip(cube_variables, cube_corner))
            for simplex_corner in simplex_corners:
                value = sp.factor(rational.subs({
                    n: order,
                    **cube_substitution,
                    **simplex_corner,
                }))
                if corner_minimum is None or value < corner_minimum:
                    corner_minimum = value
                    corner_witness = {
                        "order": order,
                        "cube": cube_corner,
                        "simplex": tuple(simplex_corner[variable] for variable in y),
                    }
                if value < 0:
                    corner_failures.append({
                        "order": order,
                        "cube": cube_corner,
                        "simplex": tuple(simplex_corner[variable] for variable in y),
                        "value": str(value),
                    })
    numerator, denominator = sp.fraction(rational)
    # The denominator is a positive scalar monomial in n.
    denominator = sp.factor(denominator)
    shifted = sp.expand(numerator.subs(n, t + 13))
    cube_rows = tensor_bernstein(shifted, cube_variables)
    audits = [homogeneous_simplex(row, y, t)[1] for row in cube_rows]
    return {
        "sector": sector,
        "branch": branch,
        "d3_cap": "d3<=p3" if use_trivial_d3_cap else "active-root auxiliary upper bound",
        "denominator": str(denominator),
        "cube_variables": [str(variable) for variable in cube_variables],
        "cube_rows": len(cube_rows),
        "simplex_variables": len(y),
        "simplex_terms": sum(row["terms"] for row in audits),
        "negative": sum(row["negative"] for row in audits),
        "zero": sum(row["zero"] for row in audits),
        "minimum": str(min(row["minimum"] for row in audits)),
        "sample_corner_negative": len(corner_failures),
        "sample_corner_failures": corner_failures,
        "sample_corner_minimum": str(corner_minimum),
        "sample_corner_witness": corner_witness,
        "row_audits": audits,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector", choices=("high", "low"), required=True)
    parser.add_argument(
        "--branch", choices=("loose", "sparse", "dense"), default="loose"
    )
    args = parser.parse_args()
    result = build_sector(args.sector, args.branch)
    report = {
        "marker": MARKER,
        **result,
        "status": "one exact relaxation cone only; no theorem claim",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        f"iso_n5_disconnected_m5_sum12_ratio_cone_{args.branch}_"
        f"{args.sector}_root_20260830.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: report[key] for key in (
        "marker", "sector", "branch", "denominator", "cube_rows", "simplex_terms",
        "negative", "zero", "minimum", "sample_corner_negative",
        "sample_corner_minimum", "status",
    )}, indent=2))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
