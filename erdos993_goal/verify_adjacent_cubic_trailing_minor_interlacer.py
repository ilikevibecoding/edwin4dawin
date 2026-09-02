#!/usr/bin/env python3
"""Exact finite audit of an explicit adjacent-cubic common interlacer.

For the cubic row U=S_(p,a)[G], the all-order cubic theorem constructs a
positive symmetric Jacobi matrix M whose characteristic polynomial is the
Jacobi transform of U.  Let C be the characteristic polynomial of the
trailing principal minor M[1:,1:].  Cauchy's theorem makes C an interlacer
of U automatically.  Computation indicates the stronger second fact that C
also interlaces y*H, where H is the Jacobi transform of
S_(p-2,a+1)[G].  This gives the exact common interlacer required by the
quartic recursion.

This script reconstructs M and all three polynomials over QQ, isolates every
root in rational intervals, and certifies both interlacings.  The finite
audit is evidence for, not a proof of, the remaining all-order trailing-
minor/adjacent-row alternation lemma.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from probe_adjacent_cubic_darboux_inertia import (
    X,
    Y,
    cubic_matrix,
    jacobi_recurrence,
    window_polynomial,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "adjacent_cubic_trailing_minor_interlacer_20260805.json"


def transformed_monic(p: int, alpha: int, gamma: list[Fraction]) -> sp.Poly:
    degree = p // 2
    output = window_polynomial(p, alpha, gamma)
    transformed = sp.Poly(
        sp.cancel(
            (1 - Y) ** degree
            * output.as_expr().subs(X, -Y / (4 * (1 - Y)))
        ),
        Y,
        domain=sp.QQ,
    )
    return sp.Poly(transformed.as_expr() / transformed.LC(), Y, domain=sp.QQ)


def exact_cubic_matrix_data(
    p: int, alpha: int, gamma: list[Fraction]
) -> tuple[list[sp.Expr], list[sp.Expr]]:
    _, tail = cubic_matrix(p, alpha, gamma)
    degree = p // 2
    beta = sp.Rational(-1, 2) if p % 2 == 0 else sp.Rational(1, 2)
    diagonal, subdiagonal, _ = jacobi_recurrence(degree, alpha, beta)
    diagonal[-2] = sp.sympify(tail["d_previous"])
    diagonal[-1] = sp.sympify(tail["d_last"])
    subdiagonal[-1] = sp.sympify(tail["terminal_coupling_squared"])
    assert all(value > 0 for value in subdiagonal[1:])
    return diagonal, subdiagonal


def characteristic_segment(
    diagonal: list[sp.Expr],
    subdiagonal: list[sp.Expr],
    start: int,
    stop: int,
) -> sp.Poly:
    previous = sp.Poly(1, Y, domain=sp.QQ)
    current = sp.Poly(Y - diagonal[start], Y, domain=sp.QQ)
    for index in range(start + 1, stop):
        previous, current = current, sp.Poly(
            (Y - diagonal[index]) * current.as_expr()
            - subdiagonal[index] * previous.as_expr(),
            Y,
            domain=sp.QQ,
        )
    return current


def primitive_digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    payload = ",".join(str(value) for value in primitive.all_coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def intervals(
    poly: sp.Poly, *, allow_zero: bool = False
) -> list[tuple[sp.Rational, sp.Rational]]:
    records = sp.polys.polytools.intervals(poly, eps=sp.Rational(1, 10) ** 32)
    output = []
    for (left, right), multiplicity in records:
        assert multiplicity == 1
        output.append((sp.Rational(left), sp.Rational(right)))
    assert len(output) == poly.degree()
    if allow_zero:
        assert output[0] == (0, 0)
        assert all(left >= 0 for left, right in output)
    else:
        assert all(left > 0 for left, right in output)
    return output


def strictly_interlaces(
    lower: list[tuple[sp.Rational, sp.Rational]],
    higher: list[tuple[sp.Rational, sp.Rational]],
) -> bool:
    if len(higher) != len(lower) + 1:
        return False
    return all(
        higher[index][1] < lower[index][0]
        and lower[index][1] < higher[index + 1][0]
        for index in range(len(lower))
    )


def one_case(
    p: int, u: Fraction, v: Fraction, c: Fraction
) -> dict[str, object]:
    alpha = p - 13
    gamma = [c, 1 - c * (u + v), -(u + v) + c * u * v, u * v]
    current = transformed_monic(p, alpha, gamma)
    adjacent = transformed_monic(p - 2, alpha + 1, gamma)
    adjacent_with_zero = sp.Poly(Y * adjacent.as_expr(), Y, domain=sp.QQ)
    diagonal, subdiagonal = exact_cubic_matrix_data(p, alpha, gamma)
    rebuilt_current = characteristic_segment(diagonal, subdiagonal, 0, len(diagonal))
    trailing_minor = characteristic_segment(diagonal, subdiagonal, 1, len(diagonal))
    assert rebuilt_current == current
    assert trailing_minor.degree() + 1 == current.degree()

    roots_current = intervals(current)
    roots_adjacent_zero = intervals(adjacent_with_zero, allow_zero=True)
    roots_minor = intervals(trailing_minor)
    assert strictly_interlaces(roots_minor, roots_current)
    assert strictly_interlaces(roots_minor, roots_adjacent_zero)
    return {
        "p": p,
        "alpha": alpha,
        "degree": current.degree(),
        "u": str(u),
        "v": str(v),
        "c": str(c),
        "current_digest": primitive_digest(current),
        "adjacent_with_zero_digest": primitive_digest(adjacent_with_zero),
        "trailing_minor_digest": primitive_digest(trailing_minor),
        "interlacing_gaps_per_pair": 2 * trailing_minor.degree(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-p", type=int, default=24)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    unit_values = [Fraction(1, 10), Fraction(1, 2), Fraction(1)]
    c_values = [Fraction(1, 10), Fraction(1), Fraction(10)]
    cases = []
    for p in range(13, args.max_p + 1):
        for i, u in enumerate(unit_values):
            for v in unit_values[i:]:
                for c in c_values:
                    cases.append(one_case(p, u, v, c))
    report = {
        "status": "EXACT_FINITE_TRAILING_MINOR_COMMON_INTERLACER_AUDIT",
        "scope": {
            "p_min": 13,
            "p_max": args.max_p,
            "u_v_values": [str(value) for value in unit_values],
            "c_values": [str(value) for value in c_values],
            "case_count": len(cases),
            "exact_strict_interlacing_inequality_count": sum(
                int(case["interlacing_gaps_per_pair"]) for case in cases
            ),
        },
        "all_order_reduction": (
            "The trailing principal minor interlaces the current cubic row "
            "by Cauchy's theorem.  It remains to prove that the same minor "
            "interlaces y times the adjacent cubic row for all parameters."
        ),
        "logical_status": (
            "The explicit common-interlacer construction is exact.  The "
            "reported parameter range is a finite rational root-isolation "
            "audit, not the missing uniform alternation proof."
        ),
        "cases": cases,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["scope"], indent=2))


if __name__ == "__main__":
    main()
