"""Exact first-cell obstruction to collapsed raw-to-Q-sharp multipliers."""

from __future__ import annotations

import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "raw_alpha_zero_multiplier_obstruction_exact_20260810.json"
Z = sp.symbols("z")


def binom(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def path_count(M: int, i: int) -> int:
    return binom(2 * M - i - 1, i)


def fixed_grade_rows(N: int, d: int, s: int) -> tuple[list[sp.Expr], list[sp.Expr]]:
    """Return the true raw and factorial-normalized fixed-grade rows."""
    degree = 2 * N - d - s
    raw = [sp.Integer(0)] * (degree + 1)
    normalized_numerators = [sp.Integer(0)] * (degree + 1)

    for q, sign in enumerate((1, -2, 1)):
        M = N - q
        derivative_order = d - 2 * q
        for i in range(s + 1):
            path_weight = path_count(M, i) * path_count(M, s - i)
            for j in range(degree + 1):
                first_derivatives = M - i - j
                if not 0 <= first_derivatives <= derivative_order:
                    continue
                base = sp.Integer(
                    sign
                    * path_weight
                    * binom(derivative_order, first_derivatives)
                )
                normalized_numerators[j] += base
                raw[j] += (
                    base
                    * factorial(M - i)
                    // factorial(j)
                    * factorial(M - s + i)
                    // factorial(degree - j)
                )

    normalized = [
        sp.Rational(normalized_numerators[j], factorial(j) * factorial(degree - j))
        for j in range(degree + 1)
    ]
    return raw, normalized


def main() -> None:
    N, d, s = 6, 5, 1
    degree = d + s
    assert degree == N == 2 * N - d - s

    raw, normalized = fixed_grade_rows(N, d, s)
    expected_raw = [1200, 42816, 266178, 472368, 266178, 42816, 1200]
    expected_normalized = [
        sp.Rational(1, 72),
        sp.Rational(11, 30),
        sp.Rational(23, 12),
        sp.Rational(29, 9),
        sp.Rational(23, 12),
        sp.Rational(11, 30),
        sp.Rational(1, 72),
    ]
    assert raw == expected_raw
    assert normalized == expected_normalized

    raw_poly = sp.Poly(sum(raw[j] * Z**j for j in range(degree + 1)), Z)
    normalized_poly = sp.Poly(
        sum(normalized[j] * Z**j for j in range(degree + 1)), Z
    )
    assert raw_poly.count_roots(-sp.oo, 0) == degree
    assert normalized_poly.count_roots(-sp.oo, 0) == degree

    ratios = [sp.cancel(normalized[j] / raw[j]) for j in range(degree + 1)]
    symbol = sp.Poly(
        sum(sp.binomial(degree, j) * ratios[j] * Z**j for j in range(degree + 1)),
        Z,
        domain=sp.QQ,
    )
    _, primitive = symbol.clear_denoms(convert=True)
    primitive = sp.Poly(primitive, Z, domain=sp.ZZ)
    expected_symbol = sp.Poly(
        97356511109 * (Z**6 + 1)
        + 432210520170 * (Z**5 + Z)
        + 908540802000 * (Z**4 + Z**2)
        + 1147582084000 * Z**3,
        Z,
        domain=sp.ZZ,
    )
    assert primitive == expected_symbol
    real_roots = int(primitive.count_roots(-sp.oo, sp.oo))
    assert real_roots == 2

    report = {
        "status": "PASS_EXACT_RAW_ALPHA_ZERO_MULTIPLIER_OBSTRUCTION",
        "cell": {"N": N, "d": d, "s": s, "degree": degree},
        "raw_negative_roots": int(raw_poly.count_roots(-sp.oo, 0)),
        "normalized_negative_roots": int(normalized_poly.count_roots(-sp.oo, 0)),
        "ratio_symbol_real_roots": real_roots,
        "ratio_symbol_degree": primitive.degree(),
        "ratio_symbol_coefficients_ascending": [
            int(primitive.nth(j)) for j in range(degree + 1)
        ],
        "conclusion": (
            "The true raw-to-normalized middle-grade map cannot factor into "
            "separate finite multiplier sequences on the final x/y exponents."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
