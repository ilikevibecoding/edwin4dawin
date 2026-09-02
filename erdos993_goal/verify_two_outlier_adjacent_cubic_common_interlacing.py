#!/usr/bin/env python3
"""Exact finite audit of the quartic-to-cubic compatibility reduction.

Let

    G(t)=(1-u*t)(1-v*t)(t+c)

and put

    U=S_(p,alpha)[G],
    V=t*S_(p-2,alpha+1)[G].

The recursion S[(t+d)G]=d*U+V shows that the degree-four two-outlier
window theorem is precisely positive compatibility of U and V.  Since the
degree-three theorem already proves that U and V are real-rooted, this is
equivalent to the two polynomials having a common interlacer.

This script is a finite exact audit, not the missing all-order proof.  It
constructs U and V from the factorial formula (717), isolates every root in
a rational interval, and certifies the interval-overlap criterion for a
common interlacer.  No floating-point root is used.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_outlier_adjacent_cubic_common_interlacing_20260805.json"
X = sp.symbols("x")


def gamma_coefficients(u: Fraction, v: Fraction, c: Fraction) -> list[Fraction]:
    return [c, 1 - c * (u + v), -(u + v) + c * u * v, u * v]


def window_polynomial(
    p: int, alpha: int, gamma: list[Fraction]
) -> sp.Poly:
    coefficients: list[Fraction] = []
    for k in range(p // 2 + 1):
        inner = sum(
            gamma[h]
            * Fraction(
                math.factorial(p - 2 * h),
                math.factorial(p + alpha - h) * math.factorial(k - h),
            )
            for h in range(min(k, len(gamma) - 1) + 1)
        )
        prefactor = Fraction(
            math.factorial(p + 2 * alpha),
            math.factorial(p - 2 * k) * math.factorial(alpha + k),
        )
        coefficients.append(prefactor * inner)
    return sp.Poly(
        sum(sp.Rational(value.numerator, value.denominator) * X**k
            for k, value in enumerate(coefficients)),
        X,
        domain=sp.QQ,
    )


def primitive_digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    payload = ",".join(str(value) for value in primitive.all_coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def isolating_intervals(
    poly: sp.Poly, *, allow_zero: bool = False
) -> list[tuple[sp.Rational, sp.Rational]]:
    records = sp.polys.polytools.intervals(poly, eps=sp.Rational(1, 10) ** 35)
    output: list[tuple[sp.Rational, sp.Rational]] = []
    for (left, right), multiplicity in records:
        assert multiplicity == 1
        output.append((sp.Rational(left), sp.Rational(right)))
    assert len(output) == poly.degree()
    if allow_zero:
        assert all(right <= 0 for left, right in output)
        assert output[-1] == (0, 0)
    else:
        assert all(right < 0 for left, right in output)
    return output


def common_interlacer_overlap(
    left: list[tuple[sp.Rational, sp.Rational]],
    right: list[tuple[sp.Rational, sp.Rational]],
) -> bool:
    """Certify max(l_i,r_i)<min(l_(i+1),r_(i+1)) for every i."""
    if len(left) != len(right):
        return False
    return all(
        left[index][1] < right[index + 1][0]
        and right[index][1] < left[index + 1][0]
        for index in range(len(left) - 1)
    )


def one_case(
    p: int, u: Fraction, v: Fraction, c: Fraction
) -> dict[str, object]:
    alpha = p - 13
    gamma = gamma_coefficients(u, v, c)
    U = window_polynomial(p, alpha, gamma)
    H = window_polynomial(p - 2, alpha + 1, gamma)
    V = sp.Poly(X * H.as_expr(), X, domain=sp.QQ)
    assert U.degree() == V.degree() == p // 2
    roots_U = isolating_intervals(U)
    roots_V = isolating_intervals(V, allow_zero=True)
    assert common_interlacer_overlap(roots_U, roots_V)
    return {
        "p": p,
        "alpha": alpha,
        "degree": U.degree(),
        "u": str(u),
        "v": str(v),
        "c": str(c),
        "U_digest": primitive_digest(U),
        "V_digest": primitive_digest(V),
        "common_interlacer_interval_gaps": U.degree() - 1,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-p", type=int, default=30)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    assert args.max_p >= 14

    unit_values = [Fraction(1, 10), Fraction(1, 2), Fraction(1)]
    c_values = [Fraction(1, 10), Fraction(1), Fraction(10)]
    cases: list[dict[str, object]] = []
    for p in range(13, args.max_p + 1):
        for i, u in enumerate(unit_values):
            for v in unit_values[i:]:
                for c in c_values:
                    cases.append(one_case(p, u, v, c))

    report = {
        "status": "EXACT_FINITE_COMMON_INTERLACING_AUDIT",
        "statement": {
            "identity": "S_(p,a)[(t+d)G]=d*S_(p,a)[G]+t*S_(p-2,a+1)[G]",
            "G": "(1-u*t)(1-v*t)(t+c)",
            "quartic_reduction": (
                "At reserve p-alpha>=13, the quartic step is equivalent to "
                "positive compatibility of the two displayed cubic outputs."
            ),
            "finite_test": (
                "At alpha=p-13, every pair has exact rational root intervals "
                "satisfying the common-interlacer overlap inequalities."
            ),
        },
        "scope": {
            "p_min": 13,
            "p_max": args.max_p,
            "u_v_values": [str(value) for value in unit_values],
            "c_values": [str(value) for value in c_values],
            "case_count": len(cases),
            "exact_overlap_inequality_count": sum(
                int(case["common_interlacer_interval_gaps"]) for case in cases
            ),
        },
        "logical_status": (
            "The recursion and reduction are all-order identities.  The root "
            "interval audit is finite evidence for the remaining common-"
            "interlacer theorem, not its proof."
        ),
        "cases": cases,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report["scope"].items()}, indent=2))


if __name__ == "__main__":
    main()
