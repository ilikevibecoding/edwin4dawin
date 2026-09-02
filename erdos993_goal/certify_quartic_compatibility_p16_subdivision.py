#!/usr/bin/env python3
"""Try an exact dyadic Bernstein subdivision certificate at p=16.

The residual compatibility resultant is a polynomial in c whose
coefficients are bivariate polynomials on 0 <= u,v <= 1.  The global
Bernstein box has 26 negative control coefficients at p=16.  This script
uses exact de Casteljau subdivision in u and v; a box is certified when
all of its control coefficients (for every power of c) are positive.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, deque
from pathlib import Path

import sympy as sp

from probe_adjacent_cubic_resultant_bernstein import (
    C_PARAMETER,
    Q,
    S,
    U,
    V,
    Y,
    digest_coefficients,
)
from prove_quartic_minimal_compatibility_resultants import (
    bernstein_uv_by_c,
    exact_orientation_cell,
    raw_changed,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "quartic_compatibility_resultant_p16_subdivision_20260806.json"
CACHE = HERE / "quartic_compatibility_resultant_p16_residual_cache_20260806.json"


def residual_polynomial(p: int, alpha: int) -> sp.Poly:
    if CACHE.exists():
        cached = json.loads(CACHE.read_text(encoding="utf-8"))
        assert cached["p"] == p and cached["alpha"] == alpha
        expression = sum(
            sp.Rational(coefficient)
            * U ** exponents[0]
            * V ** exponents[1]
            * C_PARAMETER ** exponents[2]
            for exponents, coefficient in cached["terms"]
        )
        polynomial = sp.Poly(
            expression, U, V, C_PARAMETER, domain=sp.QQ
        )
        assert digest_coefficients(polynomial) == cached["digest"]
        return polynomial
    gamma = [
        C_PARAMETER,
        1 - C_PARAMETER * S,
        -S + C_PARAMETER * Q,
        Q,
    ]
    current = raw_changed(p, alpha, gamma)
    adjacent = raw_changed(p - 2, alpha + 1, gamma)
    shifted = sp.Poly(-Y * adjacent.as_expr() / 4, Y)
    resultant = sp.factor(
        sp.resultant(current.as_expr(), shifted.as_expr(), Y)
    )
    _, factors = sp.factor_list(resultant)
    c_exponent = 0
    residual_factors: list[tuple[sp.Expr, int]] = []
    for factor, exponent in factors:
        if sp.Poly(factor, C_PARAMETER).degree() == 1 and not factor.has(S, Q):
            if sp.solve(factor, C_PARAMETER) == [0]:
                c_exponent += exponent
                continue
        residual_factors.append((factor, exponent))
    assert c_exponent == 2
    assert len(residual_factors) == 1 and residual_factors[0][1] == 1
    residual = residual_factors[0][0]
    substituted = sp.Poly(
        sp.expand(residual.subs({S: U + V, Q: U * V})),
        U,
        V,
        C_PARAMETER,
        domain=sp.QQ,
    )
    coefficients = bernstein_uv_by_c(substituted)
    positive = sum(int(bool(value > 0)) for value in coefficients)
    negative = sum(int(bool(value < 0)) for value in coefficients)
    global_sign = 1 if positive >= negative else -1
    polynomial = sp.Poly(
        global_sign * substituted.as_expr(),
        U,
        V,
        C_PARAMETER,
        domain=sp.QQ,
    )
    cache_record = {
        "p": p,
        "alpha": alpha,
        "degrees_u_v_c": [
            polynomial.degree(variable) for variable in (U, V, C_PARAMETER)
        ],
        "digest": digest_coefficients(polynomial),
        "terms": [
            [list(exponents), str(coefficient)]
            for exponents, coefficient in polynomial.terms()
        ],
    }
    CACHE.write_text(json.dumps(cache_record) + "\n", encoding="utf-8")
    return polynomial


def coefficient_cube(poly: sp.Poly) -> list[list[list[sp.Rational]]]:
    du, dv, dc = (poly.degree(variable) for variable in (U, V, C_PARAMETER))
    flat = bernstein_uv_by_c(poly)
    cube = [
        [
            [sp.Rational(0) for _ in range(dc + 1)]
            for _ in range(dv + 1)
        ]
        for _ in range(du + 1)
    ]
    index = 0
    for i in range(du + 1):
        for j in range(dv + 1):
            for k in range(dc + 1):
                cube[i][j][k] = sp.Rational(flat[index])
                index += 1
    return cube


def split_vector(values: list[sp.Rational]) -> tuple[list[sp.Rational], list[sp.Rational]]:
    triangle = [values]
    while len(triangle[-1]) > 1:
        previous = triangle[-1]
        triangle.append(
            [(previous[i] + previous[i + 1]) / 2 for i in range(len(previous) - 1)]
        )
    degree = len(values) - 1
    left = [triangle[i][0] for i in range(degree + 1)]
    right = [triangle[degree - i][i] for i in range(degree + 1)]
    return left, right


def split_u(cube: list[list[list[sp.Rational]]]) -> tuple[list, list]:
    du = len(cube) - 1
    dv = len(cube[0]) - 1
    dc = len(cube[0][0]) - 1
    left = [[[sp.Rational(0) for _ in range(dc + 1)] for _ in range(dv + 1)] for _ in range(du + 1)]
    right = [[[sp.Rational(0) for _ in range(dc + 1)] for _ in range(dv + 1)] for _ in range(du + 1)]
    for j in range(dv + 1):
        for k in range(dc + 1):
            lo, hi = split_vector([cube[i][j][k] for i in range(du + 1)])
            for i in range(du + 1):
                left[i][j][k] = lo[i]
                right[i][j][k] = hi[i]
    return left, right


def split_v(cube: list[list[list[sp.Rational]]]) -> tuple[list, list]:
    du = len(cube) - 1
    dv = len(cube[0]) - 1
    dc = len(cube[0][0]) - 1
    lower = [[[sp.Rational(0) for _ in range(dc + 1)] for _ in range(dv + 1)] for _ in range(du + 1)]
    upper = [[[sp.Rational(0) for _ in range(dc + 1)] for _ in range(dv + 1)] for _ in range(du + 1)]
    for i in range(du + 1):
        for k in range(dc + 1):
            lo, hi = split_vector([cube[i][j][k] for j in range(dv + 1)])
            for j in range(dv + 1):
                lower[i][j][k] = lo[j]
                upper[i][j][k] = hi[j]
    return lower, upper


def four_children(cube: list) -> list[list]:
    left, right = split_u(cube)
    ll, lu = split_v(left)
    rl, ru = split_v(right)
    return [ll, lu, rl, ru]


def signs(cube: list) -> tuple[int, int, int, sp.Rational, sp.Rational]:
    values = [value for plane in cube for row in plane for value in row]
    positive = sum(int(bool(value > 0)) for value in values)
    negative = sum(int(bool(value < 0)) for value in values)
    zero = len(values) - positive - negative
    return positive, negative, zero, min(values), max(values)


def cube_digest(cube: list) -> str:
    values = [str(value) for plane in cube for row in plane for value in row]
    return hashlib.sha256(",".join(values).encode("ascii")).hexdigest()


def certify(cube: list, max_depth: int = 10) -> dict[str, object]:
    queue = deque([(cube, 0, (0, 0))])
    certified = Counter()
    unresolved = []
    visited = 0
    worst_negative_by_depth: dict[int, int] = {}
    while queue:
        current, depth, address = queue.popleft()
        visited += 1
        positive, negative, zero, minimum, maximum = signs(current)
        worst_negative_by_depth[depth] = max(
            worst_negative_by_depth.get(depth, 0), negative
        )
        if negative == 0 and zero == 0:
            certified[depth] += 1
            continue
        if depth == max_depth:
            unresolved.append(
                {
                    "address_base4": "".join(str(item) for item in address[2:]),
                    "positive_negative_zero": [positive, negative, zero],
                    "minimum": str(minimum),
                    "maximum": str(maximum),
                    "digest": cube_digest(current),
                }
            )
            continue
        for child_index, child in enumerate(four_children(current)):
            queue.append((child, depth + 1, address + (child_index,)))
    return {
        "max_depth": max_depth,
        "visited_box_count": visited,
        "certified_box_count_by_depth": {
            str(depth): count for depth, count in sorted(certified.items())
        },
        "unresolved_box_count": len(unresolved),
        "unresolved_boxes": unresolved,
        "maximum_negative_control_count_by_depth": {
            str(depth): count
            for depth, count in sorted(worst_negative_by_depth.items())
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-depth", type=int, default=4)
    args = parser.parse_args()
    p, alpha = 16, 3
    polynomial = residual_polynomial(p, alpha)
    cube = coefficient_cube(polynomial)
    initial_signs = signs(cube)
    certificate = certify(cube, max_depth=args.max_depth)
    report = {
        "status": "EXACT_DYADIC_BERNSTEIN_SUBDIVISION_CERTIFICATE",
        "boundary": {"p": p, "alpha": alpha},
        "degrees_u_v_c": [
            polynomial.degree(variable) for variable in (U, V, C_PARAMETER)
        ],
        "residual_term_count": len(polynomial.terms()),
        "residual_digest": digest_coefficients(polynomial),
        "initial_control_signs_positive_negative_zero": list(initial_signs[:3]),
        "initial_minimum": str(initial_signs[3]),
        "initial_maximum": str(initial_signs[4]),
        "subdivision": certificate,
        "strict_positivity_certified": certificate["unresolved_box_count"] == 0,
        "orientation_cell": exact_orientation_cell(p, alpha),
        "scope": (
            "A successful certificate proves the residual resultant is "
            "strictly positive for 0<=u,v<=1 and c>0 at p=16."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
