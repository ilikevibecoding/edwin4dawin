#!/usr/bin/env python3
"""Exact line counterexample to the global quadratic-parent group symbol.

The special parent identity remains valid.  This only rules out applying the
parent-to-group operator to every stable bivariate input via the general
Borcea--Branden bounded-degree symbol theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly


OUT = Path("defect1_parent_group_symbol_counterexample_20260804.json")
X, U, Y, V, t = sp.symbols("X U Y V t")


def one_symbol(N: int, variable: sp.Symbol, auxiliary: sp.Symbol, state: int):
    z = variable + auxiliary
    denominator = 2 * (N - 1) * (2 * N - 1)
    if state == 0:
        low = (N - 1) * (
            2 * (2 * N - 1) * z**2 - 4 * N * auxiliary * z + N * auxiliary**2
        )
    elif state == 1:
        low = N * auxiliary * ((2 * N - 3) * z - (N - 1) * auxiliary)
    else:
        low = N * (N - 1) * auxiliary**2
    return sp.expand(z ** (N - 2) * low / denominator)


def line_symbol(m: int, bases: list[int], directions: list[int]) -> sp.Poly:
    N, d = 3 * m + 4, 2 * m + 5
    substitutions_x = {X: bases[0] + directions[0] * t, U: bases[1] + directions[1] * t}
    substitutions_y = {Y: bases[2] + directions[2] * t, V: bases[3] + directions[3] * t}
    result = sp.Poly(0, t, domain=sp.QQ)
    for state, order, weight in ((0, d, 1), (1, d - 2, -2), (2, d - 4, 1)):
        left = one_symbol(N, X, U, state)
        right = one_symbol(N, Y, V, state)
        left_chain = [
            sp.Poly(sp.diff(left, X, k).subs(substitutions_x), t, domain=sp.QQ)
            for k in range(order + 1)
        ]
        right_chain = [
            sp.Poly(sp.diff(right, Y, k).subs(substitutions_y), t, domain=sp.QQ)
            for k in range(order + 1)
        ]
        result += weight * sum(
            (
                sp.binomial(order, k) * left_chain[k] * right_chain[order - k]
                for k in range(order + 1)
            ),
            sp.Poly(0, t, domain=sp.QQ),
        )
    return result


def main() -> None:
    ctx.prec = 192
    bases = [-11, -3, 4, 19]
    directions = [1, 7, 2, 5]
    polynomial = line_symbol(1, bases, directions)
    denominator = sp.ilcm(*[sp.denom(value) for value in polynomial.all_coeffs()])
    integer = fmpz_poly(
        [int(polynomial.nth(k) * denominator) for k in range(polynomial.degree() + 1)]
    )
    real = nonreal = 0
    for root, multiplicity in integer.complex_roots():
        if root.imag.is_zero():
            real += multiplicity
        else:
            nonreal += multiplicity
    assert polynomial.degree() == 11 and real == 7 and nonreal == 4
    primitive = sp.Poly(sp.primitive(polynomial.as_expr(), t)[1], t)
    report = {
        "status": "PASS_EXACT_PARENT_GROUP_SYMBOL_COUNTEREXAMPLE",
        "m": 1,
        "N": 7,
        "d": 7,
        "bases_X_U_Y_V": bases,
        "positive_directions_X_U_Y_V": directions,
        "degree": polynomial.degree(),
        "certified_real_roots": real,
        "certified_nonreal_roots": nonreal,
        "primitive_coefficients_ascending": [
            str(primitive.nth(k)) for k in range(primitive.degree() + 1)
        ],
        "primitive_sha256": hashlib.sha256(
            str(primitive.all_coeffs()).encode("ascii")
        ).hexdigest(),
        "scope": (
            "This refutes only the global bounded-degree symbol-preserver route; "
            "it does not affect the special quadratic-Euler parent or the actual "
            "group endpoint."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
