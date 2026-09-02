#!/usr/bin/env python3
"""Sparse symmetric-coordinate probe for the degree-four Schur tail.

The four sparse exponents mean ``(S,Q,C,D)`` where

    S=u+v, Q=u*v, C=c+d, D=c*d.

This dramatically reduces the exact three-vertex tail calculation.  The
result is exploratory until positivity is transferred back to
``0<=u,v<=1`` and ``c,d>0``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from probe_two_outlier_two_negative_jacobi_tail import (
    Sparse,
    YPoly,
    sparse_add,
    sparse_multiply,
    sparse_scale,
    ypoly_add,
    ypoly_scale,
    ypoly_scale_rf,
    ypoly_y_minus,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_outlier_two_negative_symmetric_tail_probe_20260805.json"


def derive(parity: str) -> dict[str, object]:
    r = sp.symbols("r", nonnegative=True)
    field = sp.QQ.frac_field(r)
    rr = field.gens[0]
    if parity == "even":
        n, p, alpha, beta = rr + 7, 2 * rr + 14, 2 * rr + 1, field.from_sympy(sp.Rational(-1, 2))
    else:
        n, p, alpha, beta = rr + 6, 2 * rr + 13, 2 * rr, field.from_sympy(sp.Rational(1, 2))
    ambient = p + alpha

    def ff(x, h: int):
        output = field.one
        for j in range(h):
            output *= x - j
        return output

    def top(k):
        total = alpha + beta
        return (
            -k * (k + alpha) / (2 * k + total),
            k * (k - 1) * (k + alpha - 1) * (k + alpha)
            / (2 * (2 * k + total - 1) * (2 * k + total)),
        )

    def action(j: int):
        k = n - j
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        upper = field.convert(j)
        diagonal = k + (j + 1) * c0 - upper * c1
        lower = (k - 1) * c0 + (j + 2) * e0 - upper * e1 - diagonal * c0
        return upper, diagonal, lower

    actions = [action(j) for j in range(5)]

    def apply(vector, shift: int):
        output = [field.zero] * 5
        for j, coefficient in enumerate(vector):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < 4:
                output[j + 1] += coefficient * lower
        return output

    falling = [[field.one, field.zero, field.zero, field.zero, field.zero]]
    for shift in range(4):
        falling.append(apply(falling[-1], shift))

    # Exponents are S,Q,C,D.
    gamma: list[Sparse] = [
        {(0, 0, 0, 1): field.one},
        {(0, 0, 1, 0): field.one, (1, 0, 0, 1): -field.one},
        {
            (0, 0, 0, 0): field.one,
            (1, 0, 1, 0): -field.one,
            (0, 1, 0, 1): field.one,
        },
        {(0, 1, 1, 0): field.one, (1, 0, 0, 0): -field.one},
        {(0, 1, 0, 0): field.one},
    ]
    V: list[Sparse] = []
    for i in range(5):
        V.append(
            sparse_add(
                *(
                    sparse_scale(
                        gamma[h], ff(ambient, h) / ff(p, 2 * h) * falling[h][i]
                    )
                    for h in range(5)
                )
            )
        )
    print(parity, "V terms", [len(value) for value in V], flush=True)

    def recurrence(k):
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        diagonal = c0 - c1
        return diagonal, e0 - e1 - diagonal * c0

    a_last, b_last = recurrence(n - 1)
    a_previous, b_previous = recurrence(n - 2)
    a_ante, b_ante = recurrence(n - 3)

    one = {(0, 0, 0, 0): field.one}
    p_n3 = ([one], [])
    p_n4 = ([], [one])

    def recurrence_pair(previous_pair, earlier_pair, diagonal, subdiagonal):
        return (
            ypoly_add(
                ypoly_y_minus(previous_pair[0], diagonal),
                ypoly_scale_rf(earlier_pair[0], -subdiagonal),
            ),
            ypoly_add(
                ypoly_y_minus(previous_pair[1], diagonal),
                ypoly_scale_rf(earlier_pair[1], -subdiagonal),
            ),
        )

    p_n2 = recurrence_pair(p_n3, p_n4, a_ante, b_ante)
    p_n1 = recurrence_pair(p_n2, p_n3, a_previous, b_previous)
    p_n0 = recurrence_pair(p_n1, p_n2, a_last, b_last)
    Q3: YPoly = []
    R2: YPoly = []
    for coefficient, pair in zip(V, [p_n0, p_n1, p_n2, p_n3, p_n4]):
        Q3 = ypoly_add(Q3, ypoly_scale(pair[0], coefficient))
        R2 = ypoly_add(R2, ypoly_scale(pair[1], coefficient))
    Q2 = [sparse_scale(coefficient, -1) for coefficient in R2]
    # All six local coefficients may be multiplied by a common positive
    # function of r without changing any local Jacobi coupling sign.  Clear
    # their r-denominators once here; this avoids repeated polynomial gcds in
    # the degree-seven final coupling expression.
    local_coefficients = [
        coefficient
        for y_polynomial in (Q3, Q2)
        for sparse_coefficient in y_polynomial
        for coefficient in sparse_coefficient.values()
    ]
    common_denominator = field.one.denom
    for coefficient in local_coefficients:
        common_denominator = common_denominator.lcm(coefficient.denom)
    common_scale = field.convert(common_denominator)
    Q3 = [sparse_scale(coefficient, common_scale) for coefficient in Q3]
    Q2 = [sparse_scale(coefficient, common_scale) for coefficient in Q2]
    assert all(
        coefficient.denom.degree() == 0
        for y_polynomial in (Q3, Q2)
        for sparse_coefficient in y_polynomial
        for coefficient in sparse_coefficient.values()
    )
    print(parity, "local common denominator degree", common_denominator.degree(), flush=True)
    A0, A1, A2, A3 = Q3
    B0, B1, B2 = Q2

    R1 = sparse_add(
        sparse_multiply(A1, sparse_multiply(B2, B2)),
        sparse_scale(sparse_multiply(A3, sparse_multiply(B0, B2)), -1),
        sparse_scale(
            sparse_multiply(
                sparse_add(
                    sparse_multiply(A2, B2),
                    sparse_scale(sparse_multiply(A3, B1), -1),
                ),
                B1,
            ),
            -1,
        ),
    )
    H1 = sparse_scale(R1, -1)
    R0 = sparse_add(
        sparse_multiply(A0, sparse_multiply(B2, B2)),
        sparse_scale(
            sparse_multiply(
                sparse_add(
                    sparse_multiply(A2, B2),
                    sparse_scale(sparse_multiply(A3, B1), -1),
                ),
                B0,
            ),
            -1,
        ),
    )
    print(parity, "pre-E2 terms", len(B2), len(H1), len(R0), flush=True)
    E2 = sparse_add(
        sparse_multiply(
            sparse_add(
                sparse_multiply(B1, R1),
                sparse_scale(sparse_multiply(B2, R0), -1),
            ),
            R0,
        ),
        sparse_scale(sparse_multiply(B0, sparse_multiply(R1, R1)), -1),
    )
    print(parity, "E2 terms", len(E2), flush=True)

    records = {}
    for name, value in (("V0", A3), ("B2", B2), ("H1", H1), ("E2", E2)):
        sign_counts = {"positive": 0, "negative": 0, "mixed": 0}
        examples = []
        for monomial, coefficient in sorted(value.items()):
            expression = field.to_sympy(coefficient)
            numerator, denominator = sp.fraction(expression)
            numerator_poly = sp.Poly(numerator, r, domain=sp.QQ)
            denominator_poly = sp.Poly(denominator, r, domain=sp.QQ)
            if denominator_poly.LC() < 0:
                numerator_poly = -numerator_poly
                denominator_poly = -denominator_poly
            values = numerator_poly.all_coeffs()
            if all(x >= 0 for x in values) and any(x > 0 for x in values):
                sign_counts["positive"] += 1
            elif all(x <= 0 for x in values) and any(x < 0 for x in values):
                sign_counts["negative"] += 1
            else:
                sign_counts["mixed"] += 1
            if not all(x >= 0 for x in values) and len(examples) < 12:
                examples.append(
                    {
                        "index_S_Q_C_D": list(monomial),
                        "degree_r": numerator_poly.degree(),
                        "negative_coefficients": sum(1 for x in values if x < 0),
                        "digest": hashlib.sha256(
                            ",".join(map(str, values)).encode("utf-8")
                        ).hexdigest(),
                    }
                )
        records[name] = {
            "term_count": len(value),
            "degrees_S_Q_C_D": [
                max((monomial[index] for monomial in value), default=-1)
                for index in range(4)
            ],
            "coefficientwise_r_sign_counts": sign_counts,
            "first_nonpositive": examples,
        }
        print(parity, name, records[name], flush=True)
    sample_values = [Fraction(1, 100), Fraction(1, 5), Fraction(1), Fraction(5), Fraction(100)]
    unit_values = [Fraction(1, 100), Fraction(1, 5), Fraction(1, 2), Fraction(1)]
    numeric_screens = {}
    for name, value in (("V0", A3), ("B2", B2), ("H1", H1), ("E2", E2)):
        minimum = None
        negative_examples = []
        for r_value in (0, 1, 5, 20):
            evaluated_coefficients = {
                monomial: Fraction(
                    int(coefficient.numer.evaluate(0, r_value)),
                    int(coefficient.denom.evaluate(0, r_value)),
                )
                for monomial, coefficient in value.items()
            }
            for u_value in unit_values:
                for v_value in unit_values:
                    S_value, Q_value = u_value + v_value, u_value * v_value
                    for c_value in sample_values:
                        for d_value in sample_values:
                            C_value, D_value = c_value + d_value, c_value * d_value
                            result = sum(
                                coefficient
                                * S_value**monomial[0]
                                * Q_value**monomial[1]
                                * C_value**monomial[2]
                                * D_value**monomial[3]
                                for monomial, coefficient in evaluated_coefficients.items()
                            )
                            if minimum is None or result < minimum[0]:
                                minimum = (result, r_value, u_value, v_value, c_value, d_value)
                            if result <= 0 and len(negative_examples) < 12:
                                negative_examples.append(
                                    {
                                        "r": r_value,
                                        "u": str(u_value),
                                        "v": str(v_value),
                                        "c": str(c_value),
                                        "d": str(d_value),
                                        "value": str(result),
                                    }
                                )
        numeric_screens[name] = {
            "exact_grid_points": 4 * len(unit_values) ** 2 * len(sample_values) ** 2,
            "strictly_positive_on_grid": not negative_examples,
            "minimum": {
                "value": str(minimum[0]),
                "r": minimum[1],
                "u": str(minimum[2]),
                "v": str(minimum[3]),
                "c": str(minimum[4]),
                "d": str(minimum[5]),
            },
            "first_nonpositive": negative_examples,
        }
        print(parity, name, numeric_screens[name], flush=True)
    return {"parity": parity, "quantities": records, "exact_parameter_grid": numeric_screens}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("even", "odd", "both"), default="both")
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    parities = ("even", "odd") if args.parity == "both" else (args.parity,)
    report = {
        "status": "SYMMETRIC_THREE_VERTEX_SCHUR_TAIL_PROBE",
        "records": [derive(parity) for parity in parities],
        "scope": "Exact algebraic reduction; positivity in the original parameter domain remains open.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
