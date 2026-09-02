"""Exact symbolic AM--GM margin for the two degree-four lower-tail families."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


n, m, c, q, u = sp.symbols("n m c q u", integer=True)
REPORT = Path(__file__).with_name("degree4_tail_amgm_symbolic_exact_20260812.json")


def path_coefficient(deletion: int, index: sp.Expr) -> sp.Expr:
    """[v^index] P_(n-deletion), specialized when index=n-constant."""
    defect = sp.expand(n - index)
    lower = int(2 * defect - 2 * deletion - 1)
    top = sp.expand(n + defect - 2 * deletion - 1)
    if lower < 0:
        return sp.Integer(0)
    return sp.prod(top - j for j in range(lower)) / sp.factorial(lower)


def mixed_core(left: int, right: int, delta: int, forced_defect: int) -> list[sp.Expr]:
    """Five gamma-core coefficients for s=2n-delta, forced=n-forced_defect."""
    gamma = []
    for offset in range(5):
        index = n - forced_defect + offset
        opposite = 2 * n - delta - index
        row = (
            path_coefficient(left, index) * path_coefficient(right, opposite)
            + path_coefficient(left, opposite) * path_coefficient(right, index)
        ) / 2
        for earlier, value in enumerate(gamma):
            row -= value * sp.binomial(
                2 * (forced_defect - earlier) - delta, offset - earlier
            )
        gamma.append(sp.cancel(row))
    return gamma


def coefficient_dict(expression: sp.Expr) -> dict[tuple[int, int, int], sp.Expr]:
    return dict(sp.Poly(expression, c, q, u).terms())


def multiply(
    left: dict[tuple[int, int, int], sp.Expr],
    right: dict[tuple[int, int, int], sp.Expr],
    ceiling: tuple[int, int, int],
) -> dict[tuple[int, int, int], sp.Expr]:
    answer: dict[tuple[int, int, int], sp.Expr] = {}
    for a_exp, a_value in left.items():
        for b_exp, b_value in right.items():
            exponent = tuple(a_exp[j] + b_exp[j] for j in range(3))
            if all(exponent[j] <= ceiling[j] for j in range(3)):
                answer[exponent] = answer.get(exponent, 0) + a_value * b_value
    return answer


def power(
    polynomial: dict[tuple[int, int, int], sp.Expr],
    exponent: int,
    ceiling: tuple[int, int, int],
) -> dict[tuple[int, int, int], sp.Expr]:
    answer = {(0, 0, 0): sp.Integer(1)}
    for _ in range(exponent):
        answer = multiply(answer, polynomial, ceiling)
    return answer


# Coefficient and powers of (e,d,b2,b,a) in the quartic discriminant.
QUARTIC_DISCRIMINANT = [
    (256, (3, 0, 0, 0, 3)), (-192, (2, 1, 0, 1, 2)),
    (-128, (2, 0, 2, 0, 2)), (144, (1, 2, 1, 0, 2)),
    (-27, (0, 4, 0, 0, 2)), (144, (2, 0, 1, 2, 1)),
    (-6, (1, 2, 0, 2, 1)), (-80, (1, 1, 2, 1, 1)),
    (18, (0, 3, 1, 1, 1)), (16, (1, 0, 4, 0, 1)),
    (-4, (0, 2, 3, 0, 1)), (-27, (2, 0, 0, 4, 0)),
    (18, (1, 1, 1, 3, 0)), (-4, (0, 3, 0, 3, 0)),
    (-4, (1, 0, 3, 2, 0)), (1, (0, 2, 2, 2, 0)),
]


def critical_coefficients(delta: int, forced_defect: int) -> tuple[sp.Expr, ...]:
    mixed = {
        pair: mixed_core(*pair, delta, forced_defect)
        for pair in ((0, 0), (1, 1), (0, 1), (1, 2), (2, 2))
    }
    coefficients = []
    for index in range(5):
        U = mixed[0, 0][index] + u * mixed[1, 1][index]
        X = mixed[0, 1][index] + u * mixed[1, 2][index]
        Y = mixed[1, 1][index] + u * mixed[2, 2][index]
        coefficients.append(
            coefficient_dict(X + c * (U + 2 * (q - 1) * X + (q - 1) ** 2 * Y))
        )

    targets = ((6, 12, 4), (6, 10, 6), (6, 11, 5), (5, 10, 5), (4, 8, 6))
    values = []
    for target in targets:
        value = 0
        for scalar, exponents in QUARTIC_DISCRIMINANT:
            product = {(0, 0, 0): sp.Integer(1)}
            for index, exponent in enumerate(exponents):
                if exponent:
                    product = multiply(product, power(coefficients[index], exponent, target), target)
            value += scalar * product.get(target, 0)
        values.append(sp.factor(value))
    A, B, minus_N1, minus_N2, C = values
    return A, B, C, -minus_N1, -minus_N2


def main() -> None:
    expected_ratios = {
        (10, 9): 441 * (n - 7) ** 2 * (n - 1) ** 4 * (n + 3) ** 2
        / (2 * (n**4 + 38*n**3 - 716*n**2 + 1314*n + 441) ** 2),
        (11, 10): 578 * (n - 8) ** 2 * (n - 1) ** 4 * (n + 4) ** 2
        / (5*n**4 + 48*n**3 - 1519*n**2 + 2874*n + 1088) ** 2,
    }
    certificates = []
    for tail, expected in expected_ratios.items():
        A, B, C, N1, N2 = critical_coefficients(*tail)
        assert sp.factor(B - 4*C) == 0
        assert sp.factor(N1 - 2*N2) == 0
        ratio = sp.factor(sp.cancel(2*A*B / N1**2))
        assert sp.factor(ratio - expected) == 0
        numerator, denominator = sp.fraction(sp.cancel(ratio - 1))
        shifted = sp.Poly(sp.expand(numerator.subs(n, m + 12)), m)
        assert all(value > 0 for value in shifted.all_coeffs())
        certificates.append({
            "delta": tail[0],
            "forced_zero_order": f"n-{tail[1]}",
            "ratio_2AB_over_N1_squared": str(ratio),
            "shifted_margin_numerator_coefficients_ascending": [
                str(value) for value in reversed(shifted.all_coeffs())
            ],
            "margin_denominator": str(sp.factor(denominator)),
        })
    report = {
        "status": "EXACT_SYMBOLIC_PASS",
        "n_range": "n>=12",
        "scope": (
            "Uniformly absorbs the two central midpoint terms in both core-degree-four "
            "lower-tail families. Other negative coefficients appear for larger n and "
            "require additional SONC allocations before the entire discriminant follows."
        ),
        "tails": certificates,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
