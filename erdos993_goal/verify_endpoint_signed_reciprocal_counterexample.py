"""Exact obstruction to the signed-reciprocal endpoint shortcut.

This does not contradict the F/G target.  It shows only that the stronger
claim that every signed pencil R-qR* is real-rooted is false.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_signed_reciprocal_counterexample_exact_20260812.json"
z, t = sp.symbols("z t")


def path(M: int) -> list[Fraction]:
    return [Fraction(comb(2 * M - i - 1, i)) for i in range(M)]


def add(
    left: list[Fraction],
    right: list[Fraction],
    scale: Fraction = Fraction(1),
) -> list[Fraction]:
    return [
        (left[i] if i < len(left) else 0)
        + scale * (right[i] if i < len(right) else 0)
        for i in range(max(len(left), len(right)))
    ]


def slice_row(
    left: list[Fraction], right: list[Fraction], degree: int
) -> list[Fraction]:
    return [
        (left[i] if i < len(left) else 0)
        * (right[degree - i] if 0 <= degree - i < len(right) else 0)
        for i in range(degree + 1)
    ]


def as_expr(coefficients: list[Fraction]) -> sp.Expr:
    return sp.expand(
        sum(sp.Rational(value.numerator, value.denominator) * z**i
            for i, value in enumerate(coefficients))
    )


def main() -> None:
    # N=6, s=6, c=12, u=1/1000.  Since V=vS and W=vT, the
    # relevant unshifted raw row has degree s-1=5 and one forced z factor.
    N = 6
    s = 6
    c = Fraction(12)
    u = Fraction(1, 1000)
    q = Fraction(9, 10)

    P = path(N)
    C = path(N - 1)
    D = path(N - 2)
    V = add(P, C, Fraction(-1))
    W = add(C, D, Fraction(-1))
    assert V[0] == W[0] == 0
    S = V[1:]
    T = W[1:]
    A = add(C, V, c)
    B = add(D, W, c)

    raw = add(slice_row(A, S, s - 1), slice_row(B, T, s - 1), u)
    forced = next(i for i, value in enumerate(raw) if value != 0)
    assert forced == 1
    effective_degree = s - 2 * forced - 1
    assert effective_degree == 3
    reduced = raw[forced : forced + effective_degree + 1]
    R = as_expr(reduced)
    R_star = sp.expand(z ** (effective_degree + 1) * R.subs(z, 1 / z))

    signed = sp.Poly(
        sp.expand(R - sp.Rational(q.numerator, q.denominator) * R_star), z
    )
    signed_discriminant = sp.factor(sp.discriminant(signed.as_expr(), z))
    expected_negative = sp.Rational(
        -125853587816677788406356208825767,
        12207031250000000,
    )
    assert signed_discriminant == expected_negative < 0

    # The required palindromization is still valid in this cell.  Its gamma
    # polynomial is a positive quadratic with positive discriminant.
    pal = sp.Poly(sp.expand(R + R_star), z)
    residual = pal
    gamma_coefficients = []
    for h in range(3):
        value = residual.nth(h)
        gamma_coefficients.append(value)
        residual -= sp.Poly(value * z**h * (1 + z) ** (4 - 2 * h), z)
    assert residual.is_zero
    gamma = sp.Poly(sum(value * t**h for h, value in enumerate(gamma_coefficients)), t)
    gamma_discriminant = sp.factor(sp.discriminant(gamma.as_expr(), t))
    assert all(value > 0 for value in gamma_coefficients)
    assert gamma_discriminant == sp.Rational(1076928536809, 10000) > 0

    report = {
        "status": "PASS_EXACT_SIGNED_RECIPROCAL_COUNTEREXAMPLE",
        "parameters": {"N": N, "s": s, "c": str(c), "u": str(u), "q": str(q)},
        "forced_raw_power": forced,
        "reduced_R_coefficients_low_to_high": [str(value) for value in reduced],
        "signed_pencil_coefficients_low_to_high": [
            str(signed.nth(i)) for i in range(signed.degree() + 1)
        ],
        "signed_pencil_discriminant": str(signed_discriminant),
        "target_gamma_coefficients_low_to_high": [
            str(value) for value in gamma_coefficients
        ],
        "target_gamma_discriminant": str(gamma_discriminant),
        "scope": (
            "Disproves only the stronger all-signed reciprocal pencil route; "
            "the required positive palindromization remains negative-rooted in this cell."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
