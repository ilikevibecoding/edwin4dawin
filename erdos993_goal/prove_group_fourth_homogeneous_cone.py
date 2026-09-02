#!/usr/bin/env python3
"""Prove the fourth-highest homogeneous group layer in the full cone.

For layer deficit s=3 the gamma transform again has four-term Jacobi
bandwidth.  This script derives the single modified squared coupling in both
parities for every upper offset r>=3, proves it positive coefficientwise in
the cone slack, and verifies the six lower-offset families r=0,1,2 by exact
positive-shift certificates.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_group_fourth_homogeneous_boundaries import coupling_ratio


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_fourth_homogeneous_cone_theorem_20260804.json"


def coefficient_digest(poly: sp.Poly) -> str:
    payload = ",".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def selector_newton(p: sp.Expr, alpha: sp.Expr) -> list[sp.Expr]:
    """Newton coefficients of R_(N,d,3)(lambda), N=p+alpha."""
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


def verify_selector_identity() -> None:
    """Derive the four Newton coefficients directly from the defect sum."""
    p, alpha = sp.symbols("p alpha", integer=True, positive=True)
    N = p + alpha

    def choose_fixed(top: sp.Expr, bottom: int) -> sp.Expr:
        if bottom < 0:
            return sp.S.Zero
        return sp.prod(top - h for h in range(bottom)) / sp.factorial(bottom)

    values = []
    for j in range(4):
        defect = sp.S.Zero
        for deletion, sign in enumerate((1, -2, 1)):
            M = N - deletion
            for i in range(4):
                # The third binomial is complemented so its lower index is
                # the fixed nonnegative integer i+j-3-deletion.
                defect += (
                    sign
                    * choose_fixed(2 * M - i - 1, i)
                    * choose_fixed(2 * M - 4 + i, 3 - i)
                    * choose_fixed(p - 3 - 2 * deletion, i + j - 3 - deletion)
                )
        values.append(sp.cancel(defect / choose_fixed(p, j)))

    nodes = [j * (p - j) for j in range(4)]
    derived: list[sp.Expr] = []
    for j in range(4):
        remainder = values[j] - sum(
            derived[h] * sp.prod(nodes[j] - nodes[k] for k in range(h))
            for h in range(j)
        )
        derived.append(
            sp.cancel(remainder / sp.prod(nodes[j] - nodes[k] for k in range(j)))
        )
    expected = selector_newton(p, alpha)
    assert all(sp.cancel(left - right) == 0 for left, right in zip(derived, expected))


def symbolic_upper_ratio(parity: str) -> sp.Expr:
    """Derive u^2/b_(n-1) for r>=3 in one parity."""
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
    return sp.cancel(coupling_squared / b_last)


def upper_positive_factorization(ratio: sp.Expr, parity: str) -> dict[str, object]:
    n = next(symbol for symbol in ratio.free_symbols if symbol.name == "n")
    alpha = next(symbol for symbol in ratio.free_symbols if symbol.name == "alpha")
    slack = sp.symbols("slack", nonnegative=True, integer=True)
    n_value = (
        (alpha + slack + 11) / 2
        if parity == "even"
        else (alpha + slack + 10) / 2
    )
    reduced = sp.factor(sp.cancel(ratio.subs(n, n_value)))
    numerator, denominator = map(sp.factor, sp.fraction(sp.together(reduced)))
    linear_numerator = 2 * (4 * alpha + 2 * slack + 17) ** 2 * (
        4 * alpha + 2 * slack + 19
    )
    linear_denominator = (
        3
        * (alpha + slack + 6) ** 2
        * (alpha + slack + 7) ** 2
        * (alpha + slack + 8)
        * (alpha + slack + 9)
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
    m = sp.symbols("m", integer=True, nonnegative=True)
    records = []
    for offset in range(3):
        for parity in ("even", "odd"):
            ratio = coupling_ratio(offset, parity)
            n = next(symbol for symbol in ratio.free_symbols if symbol.name == "n")
            minimum = 4 if offset == 2 else 3
            numerator, denominator = map(sp.factor, sp.fraction(sp.together(ratio)))
            shifted_numerator = sp.Poly(
                sp.expand(numerator.subs(n, m + minimum)), m, domain=sp.QQ
            )
            shifted_denominator = sp.Poly(
                sp.expand(denominator.subs(n, m + minimum)), m, domain=sp.QQ
            )
            assert all(value > 0 for value in shifted_numerator.coeffs())
            assert all(value > 0 for value in shifted_denominator.coeffs())
            records.append(
                {
                    "case": f"r{offset}_{parity}",
                    "minimum_n": minimum,
                    "ratio": str(ratio),
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

    verify_selector_identity()
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
        "status": "ALL_ORDER_FOURTH_HOMOGENEOUS_LAYER_THEOREM",
        "layer_deficit": 3,
        "selector_identity_derived_from_defect_sum": True,
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
            "The s=3 residual row is the characteristic polynomial of a "
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
