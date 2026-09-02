#!/usr/bin/env python3
"""Exact fixed-(n,r) Bernstein cell for Delta1/2 complementary capacities."""

from __future__ import annotations

import argparse
import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from prove_rank7_terminal_broom_delta0_large import normalized_low
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


def build(rank: int, n: int, root_degree: int, branch: str, q_endpoint: int):
    if not 25 <= n <= 38:
        raise ValueError("fixed prover is for 25<=n<=38")
    if not 1 <= root_degree <= 7:
        raise ValueError("small-root strip is 1<=r<=7")
    expression, (x, y, z, q, s, d) = normalized_low(rank)
    X, Y, U, V, S = sp.symbols("X Y U V S", nonnegative=True)
    m = n - root_degree - 1
    t_n = sp.Rational((n - 7) * (n - 8), n - 3)

    if rank == 1:
        y_low = sp.Rational(5, n - 4)
        y_high = 5 / t_n
        y_value = y_low + (y_high - y_low) * Y
        d5_low = (2 + y_value) / 12
        d5_high = sp.Rational(1, 6) + y_value / 2
        d5_value = d5_low + (d5_high - d5_low) * V
        z_value = sp.factor(y_value / (1 - d5_value))
        x_value = sp.Integer(1)
        box = (Y, V, S)
    elif rank == 2:
        x_low = sp.Rational(4, n - 3)
        x_high = sp.Rational(4 * (n - 2), (n - 5) * (n - 6))
        x_value = x_low + (x_high - x_low) * X
        d4_low = (2 + x_value) / 10
        d4_value = d4_low + (D4_CEILING - d4_low) * U
        y_value = sp.factor(x_value / (1 - d4_value))
        d5_low = (2 + y_value) / 12
        d5_high = sp.Rational(1, 6) + y_value / 2
        d5_value = d5_low + (d5_high - d5_low) * V
        z_value = sp.factor(y_value / (1 - d5_value))
        box = (X, U, V, S)
    else:
        raise ValueError(rank)

    q_value = (
        sp.Rational(1, 7) + z_value / 2
        if q_endpoint
        else (2 + z_value) / 14
    )
    switch = sp.Rational(m - 4, m + 1)
    if branch == "containment":
        if root_degree > 4:
            raise ValueError("containment interval is only needed for r<=4")
        assert sp.Rational(5, n - 4) >= 1 - switch
        s_value = (1 - y_value) + (switch - (1 - y_value)) * S
        d_value = 1 - s_value * z_value
    elif branch == "extension":
        if root_degree > 4:
            raise ValueError("split extension interval is only for r<=4")
        s_value = switch + (1 - switch) * S
        d_value = 1 - z_value * sp.Rational(m - 4, 5) * (1 - s_value)
    elif branch == "extension_mass":
        if root_degree < 5:
            raise ValueError("mass-only extension interval is for r>=5")
        mass = 1 - sp.Rational(comb(m, 4), comb(n - 4, 5))
        assert mass >= switch
        s_value = mass + (1 - mass) * S
        d_value = 1 - z_value * sp.Rational(m - 4, 5) * (1 - s_value)
    else:
        raise ValueError(branch)

    source_variables = (x, y, z, q, s, d)
    source = sp.Poly(expression, *source_variables, domain=sp.QQ)
    maxima = source.degree_list()
    maps = []
    midpoint = {variable: sp.Rational(1, 2) for variable in box}
    for value in (x_value, y_value, z_value, q_value, s_value, d_value):
        numerator, denominator = sp.fraction(sp.cancel(value))
        if denominator.subs(midpoint) < 0:
            numerator, denominator = -numerator, -denominator
        assert denominator.subs(midpoint) > 0
        maps.append(
            (
                sp.Poly(sp.expand(numerator), *box, domain=sp.QQ),
                sp.Poly(sp.expand(denominator), *box, domain=sp.QQ),
            )
        )
    powers = [
        [num**power * den**(maximum - power) for power in range(maximum + 1)]
        for maximum, (num, den) in zip(maxima, maps)
    ]
    cleared = sp.Poly(0, *box, domain=sp.QQ)
    for monomial, coefficient in source.terms():
        term = sp.Poly(coefficient, *box, domain=sp.QQ)
        for axis, power in enumerate(monomial):
            term *= powers[axis][power]
        cleared += term
    denominator = sp.Poly(1, *box, domain=sp.QQ)
    for maximum, (_, den) in zip(maxima, maps):
        denominator *= den**maximum
    return cleared, denominator, box


def certify(rank: int, n: int, root_degree: int, branch: str, q_endpoint: int):
    numerator, denominator, box = build(rank, n, root_degree, branch, q_endpoint)
    ddegrees, dcoefficients = tensor_bernstein_fast(denominator.as_expr(), box)
    dminimum, dindex = minimum_with_index(dcoefficients)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(numerator.as_expr(), box)
    minimum, index = minimum_with_index(coefficients)
    result = {
        "rank": rank,
        "n": n,
        "root_degree": root_degree,
        "m": n - root_degree - 1,
        "branch": branch,
        "q_endpoint": q_endpoint,
        "numerator_terms": len(numerator.terms()),
        "numerator_degrees": list(degrees),
        "numerator_coefficients": int(coefficients.size),
        "numerator_minimum": str(minimum),
        "numerator_minimum_index": [int(item) for item in index],
        "denominator_degrees": list(ddegrees),
        "denominator_coefficients": int(dcoefficients.size),
        "denominator_minimum": str(dminimum),
        "denominator_minimum_index": [int(item) for item in dindex],
        "status": "PASS" if minimum >= 0 else "FAIL",
    }
    if minimum < 0:
        raise AssertionError(result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=(1, 2), required=True)
    parser.add_argument("--n", type=int, required=True)
    parser.add_argument("--root-degree", type=int, required=True)
    parser.add_argument(
        "--branch", choices=("containment", "extension", "extension_mass"), required=True
    )
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = certify(args.rank, args.n, args.root_degree, args.branch, args.q)
    result["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    if args.output is not None:
        args.output.write_text(
            json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        result["output"] = str(args.output)
    for key, value in result.items():
        print(key, value)
    print("PASS_DELTA12_COMPLEMENTARY_CAPACITY_FIXED_CELL")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
