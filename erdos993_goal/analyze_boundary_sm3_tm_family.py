#!/usr/bin/env python3
"""Exact two-parameter audit for the T_m Boundary-SM3 family.

This script uses only Python integer arithmetic.  It verifies the sharp
compensating identity in the accompanying note, audits a finite rectangle of
parameters, and replays the m=17, q=3 route counterexample.  A finite scan is
not an all-order proof of Boundary-SM3.
"""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path


Polynomial = list[int]


def multiply_by_a(poly: Polynomial) -> Polynomial:
    """Multiply by A(x)=1+3x+x^2."""
    out = [0] * (len(poly) + 2)
    for index, value in enumerate(poly):
        out[index] += value
        out[index + 1] += 3 * value
        out[index + 2] += value
    return out


def multiply_by_u(poly: Polynomial) -> Polynomial:
    """Multiply by U(x)=1+x."""
    return (
        [poly[0]]
        + [poly[index - 1] + poly[index] for index in range(1, len(poly))]
        + [poly[-1]]
    )


def coefficient(poly: Polynomial, rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def binomial(n: int, rank: int) -> int:
    return comb(n, rank) if 0 <= rank <= n else 0


def record(values: dict[str, int], m: int, q: int) -> dict[str, object]:
    return {"m": m, "q": q, **values}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-branches", type=int, default=300)
    parser.add_argument("--max-isolates", type=int, default=600)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("boundary_sm3_tm_family_exact_20260813.json"),
    )
    args = parser.parse_args()
    if args.max_branches < 1 or args.max_isolates < 0:
        raise ValueError("require max-branches >= 1 and max-isolates >= 0")

    counts = {
        "admissible_parameter_pairs": 0,
        "negative_closed_row_pairs": 0,
        "second_conditional_split_failures_under_negative_condition": 0,
        "strong_single_target_failures_under_negative_condition": 0,
        "compensator_margin_failures": 0,
        "positive_binomial_margin_failures": 0,
        "actual_boundary_failures": 0,
        "identity_failures": 0,
    }
    first_route_failure: tuple[int, int, dict[str, int]] | None = None
    first_strong_failure: tuple[int, int, dict[str, int]] | None = None
    minimum_compensator: dict[str, object] | None = None
    minimum_boundary: dict[str, object] | None = None
    certified_witness: dict[str, object] | None = None

    # P=A^m and C=P(1+x)^q are advanced multiplicatively, avoiding any
    # floating-point or symbolic expansion.
    p_poly: Polynomial = [1]
    for m in range(1, args.max_branches + 1):
        p_poly = multiply_by_a(p_poly)
        c_poly = p_poly[:]
        for q in range(0, args.max_isolates + 1):
            if q:
                c_poly = multiply_by_u(c_poly)

            n = 2 * m + q
            beta = n + 1
            if beta % 3 == 0:
                continue
            counts["admissible_parameter_pairs"] += 1
            epsilon = n % 3
            assert epsilon in (0, 1)
            a = n // 3
            rank = (2 * beta) // 3
            assert n - rank == a

            # F=A^m U^q + x U^n and H=A^m.
            def h(k: int) -> int:
                return coefficient(p_poly, k)

            def c(k: int) -> int:
                return coefficient(c_poly, k)

            def x_term(k: int) -> int:
                return binomial(n, k - 1)

            def f(k: int) -> int:
                return c(k) + x_term(k)

            d_h = 3 * h(rank) - h(rank - 1)
            q_c = 3 * c(rank + 1) + 2 * c(rank) - c(rank - 1)
            q_x = (
                3 * x_term(rank + 1)
                + 2 * x_term(rank)
                - x_term(rank - 1)
            )
            pair_reserve = 3 * f(rank + 1) + 2 * f(rank) - f(rank - 1)
            boundary = pair_reserve + d_h
            second_margin = 3 * f(rank + 1) + f(rank) - f(rank - 1)
            strong_margin = boundary - f(rank)

            # Palindromicity gives Q_r(C)+D_r(H)=3j_a-j_(a+1), where
            # J=A^m(U^(q+1)+x^q).  Compute the right side without forming J.
            z_poly = multiply_by_u(c_poly)
            j_a = coefficient(z_poly, a) + h(a - q)
            j_next = coefficient(z_poly, a + 1) + h(a + 1 - q)
            compensator = 3 * j_a - j_next
            direct_compensator = q_c + d_h

            # The xU^n contribution reverses to three adjacent low binomials.
            binomial_margin = (
                3 * binomial(n, a)
                + 2 * binomial(n, a + 1)
                - binomial(n, a + 2)
            )
            identity_ok = (
                compensator == direct_compensator
                and q_x == binomial_margin
                and boundary == compensator + binomial_margin
            )
            if not identity_ok:
                counts["identity_failures"] += 1

            values = {
                "G_order": 3 * m + q + 3,
                "beta": beta,
                "rank": rank,
                "a": a,
                "epsilon": epsilon,
                "D_r_H": d_h,
                "second_conditional_margin": second_margin,
                "strong_single_target_margin": strong_margin,
                "compensator_margin": compensator,
                "positive_binomial_margin": binomial_margin,
                "Boundary_SM3_margin": boundary,
                "f_r": f(rank),
            }

            if d_h < 0:
                counts["negative_closed_row_pairs"] += 1
                if second_margin < 0:
                    counts[
                        "second_conditional_split_failures_under_negative_condition"
                    ] += 1
                    key = (values["G_order"], m, q)
                    if first_route_failure is None or key < (
                        first_route_failure[0],
                        first_route_failure[1],
                        first_route_failure[2]["q"],
                    ):
                        first_route_failure = (values["G_order"], m, record(values, m, q))
                if strong_margin < 0:
                    counts[
                        "strong_single_target_failures_under_negative_condition"
                    ] += 1
                    key = (values["G_order"], m, q)
                    if first_strong_failure is None or key < (
                        first_strong_failure[0],
                        first_strong_failure[1],
                        first_strong_failure[2]["q"],
                    ):
                        first_strong_failure = (values["G_order"], m, record(values, m, q))

            if compensator < 0:
                counts["compensator_margin_failures"] += 1
            if binomial_margin <= 0:
                counts["positive_binomial_margin_failures"] += 1
            if boundary < 0:
                counts["actual_boundary_failures"] += 1

            item = record(values, m, q)
            if (
                minimum_compensator is None
                or compensator < minimum_compensator["compensator_margin"]
            ):
                minimum_compensator = item
            if (
                minimum_boundary is None
                or boundary < minimum_boundary["Boundary_SM3_margin"]
            ):
                minimum_boundary = item
            if (m, q) == (17, 3):
                certified_witness = item

    assert counts["identity_failures"] == 0
    assert counts["positive_binomial_margin_failures"] == 0
    assert certified_witness is not None
    assert certified_witness["D_r_H"] == -107_372_408
    assert certified_witness["second_conditional_margin"] == -339_459_400
    assert certified_witness["Boundary_SM3_margin"] == 57_086_629_816
    assert certified_witness["strong_single_target_margin"] == -446_831_808

    report = {
        "status": "BOUNDED_EVIDENCE_AND_EXACT_COMPENSATING_IDENTITY_NOT_ALL_ORDER_PROOF",
        "family": {
            "A": "1+3x+x^2",
            "I_T_m": "A^m+x(1+x)^(2m)",
            "I_F": "A^m(1+x)^q+x(1+x)^(2m+q)",
            "I_H": "A^m",
            "beta": "2m+q+1",
        },
        "exact_identity": {
            "parameterization": "n=2m+q=3a+epsilon, epsilon in {0,1}",
            "J_m_q": "A^m((1+x)^(q+1)+x^q)",
            "Boundary_SM3": (
                "3[x^a]J_m_q-[x^(a+1)]J_m_q"
                "+3*C(n,a)+2*C(n,a+1)-C(n,a+2)"
            ),
            "binomial_positivity_reason": (
                "C(n,a+2)/C(n,a+1)=(2a+epsilon-1)/(a+2)<2"
            ),
            "remaining_family_target": "[x^(a+1)]J_m_q <= 3[x^a]J_m_q",
        },
        "bounds": {
            "branches": [1, args.max_branches],
            "isolates": [0, args.max_isolates],
        },
        "counts": counts,
        "first_route_failure_by_G_order": first_route_failure[2]
        if first_route_failure
        else None,
        "first_strong_failure_by_G_order": first_strong_failure[2]
        if first_strong_failure
        else None,
        "minimum_compensator_margin": minimum_compensator,
        "minimum_actual_boundary_margin": minimum_boundary,
        "m17_q3_witness": certified_witness,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
