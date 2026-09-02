#!/usr/bin/env python3
"""Exact Bernstein cells for the complementary-capacity Delta1/2 route."""

from __future__ import annotations

import argparse
import contextlib
import io
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from prove_rank7_terminal_broom_delta0_large import choose_polynomial, normalized_low
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


def mapped(rank: int, root_degree: int, branch: str, q_endpoint: int):
    expression, (x, y, z, q, s, d) = normalized_low(rank)
    T, X, Y, U, V, S = sp.symbols("T X Y U V S", nonnegative=True)
    # The rooted-C7 dependency exists only in the finite band.  Mapping the
    # closed interval directly keeps the exact tensors much smaller than the
    # all-order substitution n=25/T.
    n = 25 + 13 * T
    m = n - root_degree - 1
    t_n = (n - 7) * (n - 8) / (n - 3)

    if rank == 1:
        y_low = 5 / (n - 4)
        y_high = 5 / t_n
        y_value = sp.factor(y_low + (y_high - y_low) * Y)
        d5_low = (2 + y_value) / 12
        d5_high = sp.Rational(1, 6) + y_value / 2
        d5_value = sp.factor(d5_low + (d5_high - d5_low) * V)
        z_value = sp.factor(y_value / (1 - d5_value))
        x_value = sp.Integer(1)
        coefficient_box = (Y, V)
    else:
        x_low = 4 / (n - 3)
        x_high = 4 * (n - 2) / ((n - 5) * (n - 6))
        x_value = sp.factor(x_low + (x_high - x_low) * X)
        d4_low = (2 + x_value) / 10
        d4_value = sp.factor(d4_low + (D4_CEILING - d4_low) * U)
        y_value = sp.factor(x_value / (1 - d4_value))
        d5_low = (2 + y_value) / 12
        d5_high = sp.Rational(1, 6) + y_value / 2
        d5_value = sp.factor(d5_low + (d5_high - d5_low) * V)
        z_value = sp.factor(y_value / (1 - d5_value))
        coefficient_box = (X, U, V)

    q_value = (
        sp.Rational(1, 7) + z_value / 2
        if q_endpoint
        else (2 + z_value) / 14
    )
    switch = sp.factor((m - 4) / (m + 1))
    if branch == "containment":
        assert root_degree <= 4
        s_value = sp.factor((1 - y_value) + (switch - (1 - y_value)) * S)
        d_value = sp.factor(1 - s_value * z_value)
    elif branch == "extension":
        assert root_degree <= 4
        s_value = sp.factor(switch + (1 - switch) * S)
        d_value = sp.factor(1 - z_value * (m - 4) * (1 - s_value) / 5)
    elif branch == "extension_mass":
        assert root_degree >= 5
        c5_lower = choose_polynomial(n - 4, 5)
        mass = sp.factor(1 - choose_polynomial(m, 4) / c5_lower)
        s_value = sp.factor(mass + (1 - mass) * S)
        d_value = sp.factor(1 - z_value * (m - 4) * (1 - s_value) / 5)
    else:
        raise ValueError(branch)

    box = (T, *coefficient_box, S)
    midpoint = {variable: sp.Rational(1, 2) for variable in box}
    source_variables = (x, y, z, q, s, d)
    source = sp.Poly(expression, *source_variables, domain=sp.QQ)
    maxima = source.degree_list()
    maps = []
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
    return cleared.as_expr(), denominator.as_expr(), box


def certify(rank: int, root_degree: int, branch: str, q_endpoint: int) -> None:
    numerator, denominator, box = mapped(rank, root_degree, branch, q_endpoint)
    npoly = sp.Poly(numerator, *box, domain=sp.QQ)
    dpoly = sp.Poly(denominator, *box, domain=sp.QQ)
    print(
        "branch",
        rank,
        root_degree,
        branch,
        q_endpoint,
        "numerator_terms",
        len(npoly.terms()),
        "degrees",
        npoly.degree_list(),
        flush=True,
    )
    ddegrees, dcoefficients = tensor_bernstein_fast(dpoly.as_expr(), box)
    dminimum, dindex = minimum_with_index(dcoefficients)
    print("denominator", ddegrees, dcoefficients.size, dminimum, dindex, flush=True)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(npoly.as_expr(), box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    assert minimum >= 0
    print(
        f"PASS_DELTA{rank}_COMPLEMENTARY_CAPACITY",
        root_degree,
        branch,
        q_endpoint,
        flush=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=(1, 2), required=True)
    parser.add_argument("--root-degree", type=int, choices=range(1, 8), required=True)
    parser.add_argument(
        "--branch", choices=("containment", "extension", "extension_mass"), required=True
    )
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--log", type=Path)
    args = parser.parse_args()
    if args.log is None:
        certify(args.rank, args.root_degree, args.branch, args.q)
    else:
        capture = io.StringIO()
        with contextlib.redirect_stdout(capture):
            certify(args.rank, args.root_degree, args.branch, args.q)
        text = capture.getvalue()
        args.log.write_text(text, encoding="utf-8")
        print(text, end="")
        print("LOG", args.log)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
