#!/usr/bin/env python3
"""Derive the six lower-offset Jacobi couplings for deficit s=3."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_fourth_homogeneous_boundary_derivation_20260804.json"


def formal_selector_newton(p: sp.Expr, alpha: sp.Expr) -> list[sp.Expr]:
    return [
        2 * (alpha + p - 3) * (alpha + p - 2) * (2 * alpha + 2 * p - 5) / 3,
        -4
        * (
            2 * alpha**3
            + 6 * alpha**2 * p
            - 30 * alpha**2
            + 6 * alpha * p**2
            - 60 * alpha * p
            + 109 * alpha
            + 2 * p**3
            - 30 * p**2
            + 109 * p
            - 120
        )
        / (3 * p * (p - 1)),
        2
        * (
            2 * alpha**3
            + 6 * alpha**2 * p
            - 63 * alpha**2
            + 6 * alpha * p**2
            - 126 * alpha * p
            + 337 * alpha
            + 2 * p**3
            - 63 * p**2
            + 337 * p
            - 504
        )
        / (3 * p * (p - 1) * (p - 2) * (p - 3)),
        12
        * (alpha + p - 4) ** 2
        / (p * (p - 1) * (p - 2) * (p - 3) * (p - 4) * (p - 5)),
    ]


def shifted_selector_newton(p0: sp.Expr, offset: int) -> list[sp.Expr]:
    """Move the formal selector from j=k+h to the residual index h."""
    kshift = 3 - offset
    ambient = p0 + kshift
    formal_p = p0 + 2 * kshift
    formal_alpha = -kshift
    x = sp.symbols("x")
    c = formal_selector_newton(formal_p, formal_alpha)
    formal_nodes = [j * (formal_p - j) for j in range(4)]
    polynomial = sum(
        c[h] * sp.prod(x - formal_nodes[j] for j in range(h)) for h in range(4)
    )
    shifted = sp.cancel(polynomial.subs(x, kshift * ambient + x))
    residual_nodes = [j * (p0 - j) for j in range(4)]
    out: list[sp.Expr] = []
    remainder = shifted
    for h in range(4):
        value = sp.cancel(remainder.subs(x, residual_nodes[h]))
        denominator = sp.prod(
            residual_nodes[h] - residual_nodes[j] for j in range(h)
        )
        coefficient = sp.cancel(value / denominator)
        out.append(coefficient)
        remainder = sp.cancel(
            remainder
            - coefficient * sp.prod(x - residual_nodes[j] for j in range(h))
        )
    assert sp.cancel(remainder) == 0
    return out


def coupling_ratio(offset: int, parity: str) -> sp.Expr:
    n = sp.symbols("n", positive=True, integer=True)
    alpha = sp.Integer(3 - offset)
    beta = sp.Rational(-1, 2) if parity == "even" else sp.Rational(1, 2)
    p = 2 * n if parity == "even" else 2 * n + 1
    ambient = p + alpha
    selector = shifted_selector_newton(p, offset)

    def top_coefficients(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        total = alpha + beta
        c = -k * (k + alpha) / (2 * k + total)
        e = (
            k
            * (k - 1)
            * (k + alpha - 1)
            * (k + alpha)
            / (2 * (2 * k + total - 1) * (2 * k + total))
        )
        return c, e

    def T_action(j: int) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
        degree = n - j
        c, e = top_coefficients(degree)
        c_next, e_next = top_coefficients(degree + 1)
        upper = sp.Integer(j)
        diagonal = degree + (j + 1) * c - upper * c_next
        lower = (
            (degree - 1) * c
            + (j + 2) * e
            - upper * e_next
            - diagonal * c
        )
        return upper, diagonal, lower

    actions = [T_action(j) for j in range(4)]

    def apply_T_minus(vector: list[sp.Expr], shift: int) -> list[sp.Expr]:
        output = [sp.S.Zero] * 4
        for j, coefficient in enumerate(vector):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < 3:
                output[j + 1] += coefficient * lower
        return output

    falling_vectors = [[sp.Integer(1), sp.S.Zero, sp.S.Zero, sp.S.Zero]]
    for shift in range(3):
        falling_vectors.append(apply_T_minus(falling_vectors[-1], shift))

    vector = [
        sum(
            selector[h]
            * sp.prod(ambient - j for j in range(h))
            * falling_vectors[h][index]
            for h in range(4)
        )
        for index in range(4)
    ]
    A, B, C = [sp.cancel(vector[j] / vector[0]) for j in range(1, 4)]

    def recurrence(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        diagonal = c - c_next
        subdiagonal = e - e_next - diagonal * c
        return diagonal, subdiagonal

    a_last, b_last = recurrence(n - 1)
    a_previous, b_previous = recurrence(n - 2)
    delta_last = a_last - A + C / b_previous
    delta_previous = a_previous - C / b_previous
    coupling_squared = (
        delta_last * delta_previous
        - ((a_last - A) * a_previous + B - b_last)
    )
    return sp.factor(sp.cancel(coupling_squared / b_last))


def main() -> None:
    n, m = sp.symbols("n m", integer=True, nonnegative=True)
    records = []
    for offset in range(3):
        for parity in ("even", "odd"):
            ratio = coupling_ratio(offset, parity)
            ratio_n = next(symbol for symbol in ratio.free_symbols if symbol.name == "n")
            numerator, denominator = map(
                sp.factor, sp.fraction(sp.together(ratio))
            )
            # Four Jacobi terms require n>=3.  At r=2 the cone d-r>=5
            # strengthens this to n>=4 in both parities.
            minimum = 4 if offset == 2 else 3
            shifted_num = sp.Poly(sp.expand(numerator.subs(ratio_n, m + minimum)), m)
            shifted_den = sp.Poly(sp.expand(denominator.subs(ratio_n, m + minimum)), m)
            record = {
                "case": f"r{offset}_{parity}",
                "minimum_n": minimum,
                "ratio": str(ratio),
                "numerator_factorization": str(numerator),
                "denominator_factorization": str(denominator),
                "shifted_numerator_coefficients": list(map(str, shifted_num.all_coeffs())),
                "shifted_denominator_coefficients": list(map(str, shifted_den.all_coeffs())),
                "shifted_numerator_positive": all(c > 0 for c in shifted_num.all_coeffs()),
                "shifted_denominator_positive": all(c > 0 for c in shifted_den.all_coeffs()),
            }
            records.append(record)
            print(
                record["case"],
                len(shifted_num.all_coeffs()),
                record["shifted_numerator_positive"],
                len(shifted_den.all_coeffs()),
                record["shifted_denominator_positive"],
                flush=True,
            )
    report = {"status": "DERIVED", "layer_deficit": 3, "records": records}
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
