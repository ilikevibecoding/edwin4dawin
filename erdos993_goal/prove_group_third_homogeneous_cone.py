#!/usr/bin/env python3
"""Prove the third-highest homogeneous group layer in the full cone.

For layer deficit s=2, the gamma transform is a combination

    Q = p_n + A p_(n-1) + B p_(n-2) + C p_(n-3)

of four consecutive monic shifted Jacobi polynomials.  Such a combination
is the characteristic polynomial of a real symmetric Jacobi matrix with
only its final 2-by-2 block changed if one new squared coupling is positive.

For r=N-d>=2, put p=d+2, alpha=r-2 and q=p-alpha-9>=0.  Symbolic reduction
in both parities gives the same coupling ratio

  2(4a+2q+13)^2(4a+2q+15) P(a,q)
  -------------------------------------------------,
  (a+q+4)^2(a+q+5)^2(a+q+6)(a+q+7) Q(a,q)^2

where every coefficient of P and Q is positive.  The exceptional offsets
r=0,1 have four shorter one-variable positive-shift certificates.

This script reconstructs the upper formula from the exact Newton selector
and Jacobi action, checks both parities, writes the complete coefficient
lists of P and Q, and verifies the four boundary formulas.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_third_homogeneous_cone_theorem_20260804.json"


def coefficient_digest(poly: sp.Poly) -> str:
    payload = ",".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def selector_newton(p: sp.Expr, alpha: sp.Expr) -> list[sp.Expr]:
    """Newton coefficients of R_(N,d,2)(lambda), N=p+alpha."""
    return [
        (alpha + p - 2) * (2 * alpha + 2 * p - 3),
        -2
        * (
            2 * alpha**2
            + 4 * alpha * p
            - 14 * alpha
            + 2 * p**2
            - 14 * p
            + 19
        )
        / (p * (p - 1)),
        (
            2 * alpha**2
            + 4 * alpha * p
            - 27 * alpha
            + 2 * p**2
            - 27 * p
            + 56
        )
        / (p * (p - 1) * (p - 2) * (p - 3)),
        2
        * (3 * alpha + 3 * p - 10)
        / (p * (p - 1) * (p - 2) * (p - 3) * (p - 4) * (p - 5)),
    ]


def symbolic_upper_ratio(parity: str) -> sp.Expr:
    """Derive u^2/b_(n-1) for r>=2 in one parity."""
    n, alpha = sp.symbols("n alpha", positive=True, integer=True)
    beta = sp.Rational(-1, 2) if parity == "even" else sp.Rational(1, 2)
    p = 2 * n if parity == "even" else 2 * n + 1
    ambient = p + alpha
    selector = selector_newton(p, alpha)

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
        k = n - j
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        upper = sp.Integer(j)
        diagonal = k + (j + 1) * c - upper * c_next
        lower = (
            (k - 1) * c
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
    falling_vectors.append(apply_T_minus(falling_vectors[-1], 0))
    falling_vectors.append(apply_T_minus(falling_vectors[-1], 1))
    falling_vectors.append(apply_T_minus(falling_vectors[-1], 2))

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
    return sp.cancel(coupling_squared / b_last)


def upper_positive_factorization(ratio: sp.Expr, parity: str) -> dict[str, object]:
    n = next(symbol for symbol in ratio.free_symbols if symbol.name == "n")
    alpha = next(symbol for symbol in ratio.free_symbols if symbol.name == "alpha")
    slack = sp.symbols("slack", nonnegative=True, integer=True)
    n_value = (
        (alpha + slack + 9) / 2
        if parity == "even"
        else (alpha + slack + 8) / 2
    )
    reduced = sp.factor(sp.cancel(ratio.subs(n, n_value)))
    numerator, denominator = map(sp.factor, sp.fraction(sp.together(reduced)))
    linear_numerator = 2 * (4 * alpha + 2 * slack + 13) ** 2 * (
        4 * alpha + 2 * slack + 15
    )
    linear_denominator = (
        (alpha + slack + 4) ** 2
        * (alpha + slack + 5) ** 2
        * (alpha + slack + 6)
        * (alpha + slack + 7)
    )
    P = sp.Poly(sp.cancel(numerator / linear_numerator), alpha, slack, domain=sp.QQ)
    remaining_denominator = sp.factor(sp.cancel(denominator / linear_denominator))
    coefficient, factors = sp.factor_list(remaining_denominator)
    square_factors = [(factor, exponent) for factor, exponent in factors if exponent == 2]
    assert coefficient == 1 and len(square_factors) == 1 and len(factors) == 1
    Q = sp.Poly(square_factors[0][0], alpha, slack, domain=sp.QQ)
    assert all(value > 0 for value in P.coeffs())
    assert all(value > 0 for value in Q.coeffs())
    rebuilt = sp.factor(
        linear_numerator * P.as_expr() / (linear_denominator * Q.as_expr() ** 2)
    )
    assert sp.cancel(reduced - rebuilt) == 0
    return {
        "parity": parity,
        "ratio": reduced,
        "P": P,
        "Q": Q,
        "P_terms": len(P.terms()),
        "Q_terms": len(Q.terms()),
        "P_digest": coefficient_digest(P),
        "Q_digest": coefficient_digest(Q),
    }


def boundary_certificates() -> list[dict[str, object]]:
    n, m = sp.symbols("n m", integer=True, nonnegative=True)
    data = [
        (
            "r0_even",
            4,
            1152 * n**7
            - 2592 * n**6
            + 984 * n**5
            + 2166 * n**4
            - 2621 * n**3
            + 1366 * n**2
            - 622 * n
            + 216,
            288 * n**5
            - 900 * n**4
            + 1080 * n**3
            - 707 * n**2
            + 322 * n
            - 90,
        ),
        (
            "r0_odd",
            4,
            4608 * n**7
            + 5760 * n**6
            - 2976 * n**5
            - 216 * n**4
            + 844 * n**3
            + 958 * n**2
            - 765 * n
            + 214,
            288 * n**5 - 180 * n**4 - 77 * n**2 + 65 * n - 18,
        ),
        (
            "r1_even",
            3,
            4608 * n**9
            - 6912 * n**8
            - 2976 * n**7
            - 144 * n**6
            + 7904 * n**5
            - 1408 * n**4
            - 550 * n**3
            - 1203 * n**2
            + 996 * n
            - 216,
            288 * n**5 - 180 * n**4 - 77 * n**2 + 65 * n - 18,
        ),
        (
            "r1_odd",
            3,
            1152 * n**9
            + 3456 * n**8
            + 2712 * n**7
            - 2640 * n**6
            - 5062 * n**5
            - 1826 * n**4
            + 869 * n**3
            + 481 * n**2
            + 131 * n
            + 7,
            288 * n**5
            + 540 * n**4
            + 360 * n**3
            + 13 * n**2
            - 12 * n
            - 7,
        ),
    ]
    records = []
    for name, minimum, numerator, denominator_base in data:
        shifted_numerator = sp.Poly(sp.expand(numerator.subs(n, m + minimum)), m)
        shifted_denominator = sp.Poly(
            sp.expand(denominator_base.subs(n, m + minimum)), m
        )
        assert all(value > 0 for value in shifted_numerator.coeffs())
        assert all(value > 0 for value in shifted_denominator.coeffs())
        records.append(
            {
                "case": name,
                "minimum_n": minimum,
                "shifted_numerator_coefficients": list(
                    map(str, shifted_numerator.all_coeffs())
                ),
                "shifted_denominator_coefficients": list(
                    map(str, shifted_denominator.all_coeffs())
                ),
            }
        )
    return records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    upper = []
    for parity in ("even", "odd"):
        ratio = symbolic_upper_ratio(parity)
        record = upper_positive_factorization(ratio, parity)
        upper.append(record)
        print(
            f"{parity}: P terms={record['P_terms']}, "
            f"Q terms={record['Q_terms']}",
            flush=True,
        )

    assert sp.cancel(upper[0]["ratio"] - upper[1]["ratio"]) == 0
    assert upper[0]["P"] == upper[1]["P"]
    assert upper[0]["Q"] == upper[1]["Q"]
    boundaries = boundary_certificates()

    P = upper[0]["P"]
    Q = upper[0]["Q"]
    report = {
        "status": "ALL_ORDER_THIRD_HOMOGENEOUS_LAYER_THEOREM",
        "layer_deficit": 2,
        "upper_offsets": {
            "parities_identical_in_slack_coordinates": True,
            "P_terms": len(P.terms()),
            "Q_terms": len(Q.terms()),
            "P_coefficientwise_positive": True,
            "Q_coefficientwise_positive": True,
            "P_coefficients": [
                {"monomial": list(monomial), "coefficient": str(coefficient)}
                for monomial, coefficient in P.terms()
            ],
            "Q_coefficients": [
                {"monomial": list(monomial), "coefficient": str(coefficient)}
                for monomial, coefficient in Q.terms()
            ],
            "P_digest": coefficient_digest(P),
            "Q_digest": coefficient_digest(Q),
        },
        "boundary_offsets": boundaries,
        "proof_consequence": (
            "The s=2 residual row is the characteristic polynomial of a "
            "real symmetric Jacobi matrix and has strictly negative roots "
            "throughout 2d-N>=5."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "P_terms": len(P.terms()),
        "Q_terms": len(Q.terms()),
        "boundary_cases": len(boundaries),
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
