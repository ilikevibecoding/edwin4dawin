#!/usr/bin/env python3
"""Exact all-rank disk proof for the repeated-Meixner region b_* >= 0.

On the symmetric outlier boundary u=v=t and with repeated benign parameter
d, the remaining polynomial is an index-one Jacobi extension of a positive
Meixner block J.  Write the negative final coupling square as -q and the
final diagonal as b_*.  For a nonreal eigenvalue z and its neutral
eigenvector, the exact energy identity is

    |z|^2 = q + b_* mu - Var_J.

When b_* >= 0, the bidiagonal Meixner factorization bounds

    mu <= (sqrt(u_r)+sqrt(ell_r))^2.

This script proves exactly, under q>=0, B>=3r+4 and 0<=t<=1, that the
resulting upper bound is at most R^2=N(N-1)/16.  The last two radical
inequalities are certified by a projective simplex substitution and 86
coefficientwise-nonnegative Bernstein controls.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "repeated_meixner_nonnegative_final_diagonal_exact_20260809.json"


def bernstein_controls(
    polynomial: sp.Poly, first: sp.Symbol, second: sp.Symbol
) -> dict[tuple[int, int], sp.Expr]:
    degree_first = polynomial.degree(first)
    degree_second = polynomial.degree(second)
    powers = {
        (i, j): polynomial.coeff_monomial(first**i * second**j)
        for i in range(degree_first + 1)
        for j in range(degree_second + 1)
    }
    result: dict[tuple[int, int], sp.Expr] = {}
    for k in range(degree_first + 1):
        for ell in range(degree_second + 1):
            result[k, ell] = sp.factor(sum(
                sp.Rational(math.comb(k, i), math.comb(degree_first, i))
                * sp.Rational(
                    math.comb(ell, j), math.comb(degree_second, j)
                )
                * powers[i, j]
                for i in range(k + 1)
                for j in range(ell + 1)
            ))
    return result


def coefficientwise_nonnegative(
    expression: sp.Expr, parameters: tuple[sp.Symbol, ...]
) -> tuple[bool, int, sp.Rational]:
    numerator = sp.together(expression).as_numer_denom()[0]
    polynomial = sp.Poly(numerator, *parameters)
    coefficients = [sp.Rational(value) for value in polynomial.coeffs()]
    return (
        bool(coefficients) and all(value >= 0 for value in coefficients),
        len(coefficients),
        min(coefficients) if coefficients else sp.Integer(0),
    )


def main() -> None:
    # Abstract neutral-eigenvector energy identity.
    real_part, imag_part, mu, nu, b_star, q = sp.symbols(
        "real_part imag_part mu nu b_star q", real=True
    )
    variance = nu - mu**2
    norm_equation = sp.Eq(
        q,
        nu - 2 * real_part * mu + real_part**2 + imag_part**2,
    )
    real_equation = sp.Eq(2 * real_part, mu + b_star)
    modulus_from_norm = sp.solve(norm_equation, imag_part**2)[0] + real_part**2
    energy_remainder = sp.factor(
        modulus_from_norm.subs(real_part, (mu + b_star) / 2)
        - (q + b_star * mu - variance)
    )
    assert energy_remainder == 0

    # All-rank parameterization.
    r, reserve_slack = sp.symbols(
        "r reserve_slack", integer=True, nonnegative=True
    )
    simplex_b, simplex_d, projective = sp.symbols(
        "simplex_b simplex_d projective", nonnegative=True
    )
    B = 3 * r + 4 + reserve_slack
    N = B + r + 1
    radius_squared = N * (N - 1) / 16

    # b_*>=0 is parameterized by y=Bd/4 and b=b_* on the triangle
    # b>=0, y>=0, b+y<=r+1.
    b_coordinate = (r + 1) * simplex_b
    y_coordinate = (r + 1) * (1 - simplex_b) * simplex_d
    d = 4 * y_coordinate / B
    t = 2 * (r + 1 - y_coordinate - b_coordinate) / N
    assert sp.factor(
        r + 1 - B * d / 4 - N * t / 2 - b_coordinate
    ) == 0

    coupling_q = sp.factor(
        (N - 1)
        * (N * (d + t) ** 2 - d * (d + 4) * (r + 1))
        / 16
    )
    u_r = sp.factor(d * (N - 1) / 4)
    ell_r = sp.factor(r * (d + 4) / 4)
    radical_free_margin = sp.factor(
        radius_squared - coupling_q - b_coordinate * (u_r + ell_r)
    )
    squared_margin = sp.factor(
        radical_free_margin**2 - 4 * b_coordinate**2 * u_r * ell_r
    )

    # q>=0 has a particularly simple projective chart.  Before the chart,
    # q has the sign of
    #   K(1-w)^2-H*x,
    # where x=simplex_b, w=simplex_d.
    K = reserve_slack + 3 * r + 4
    H = sp.expand(
        K * (1 + simplex_d**2)
        + (2 * reserve_slack + 10 * r + 12) * simplex_d
    )
    q_boundary = sp.factor(K * (1 - simplex_d) ** 2 / H)
    q_numerator_expected = sp.factor(
        K * (1 - simplex_d) ** 2 - H * simplex_b
    )
    q_numerator_actual = sp.factor(
        sp.together(coupling_q).as_numer_denom()[0]
        / (
            (r + 1) ** 2
            * (simplex_b - 1)
            * (reserve_slack + 4 * r + 4)
        )
    )
    assert sp.factor(q_numerator_actual + q_numerator_expected) == 0

    # The exact q>=0 region is 0<=simplex_b<=q_boundary.  Blow it up to the
    # unit square by simplex_b=projective*q_boundary.
    substitution = {simplex_b: projective * q_boundary}
    certificate_expressions = {
        "radical_free_margin": sp.factor(
            radical_free_margin.subs(substitution)
        ),
        "squared_margin": sp.factor(squared_margin.subs(substitution)),
    }

    certificate_records: list[dict[str, object]] = []
    total_controls = 0
    total_parameter_coefficients = 0
    global_minimum_coefficient = None
    for label, expression in certificate_expressions.items():
        numerator, denominator = sp.together(expression).as_numer_denom()
        polynomial = sp.Poly(numerator, projective, simplex_d)
        controls = bernstein_controls(polynomial, projective, simplex_d)
        control_records: list[dict[str, object]] = []
        for address, control in controls.items():
            valid, coefficient_count, minimum_coefficient = (
                coefficientwise_nonnegative(
                    control, (r, reserve_slack)
                )
            )
            assert valid
            total_parameter_coefficients += coefficient_count
            if (
                global_minimum_coefficient is None
                or minimum_coefficient < global_minimum_coefficient
            ):
                global_minimum_coefficient = minimum_coefficient
            control_records.append(
                {
                    "address": list(address),
                    "parameter_coefficient_count": coefficient_count,
                    "minimum_parameter_coefficient": str(minimum_coefficient),
                    "primitive_sha256": hashlib.sha256(
                        str(
                            sp.primitive(
                                sp.together(control).as_numer_denom()[0],
                                r,
                                reserve_slack,
                            )[1]
                        ).encode("utf-8")
                    ).hexdigest(),
                }
            )
        total_controls += len(controls)
        certificate_records.append(
            {
                "label": label,
                "degrees": [
                    polynomial.degree(projective),
                    polynomial.degree(simplex_d),
                ],
                "positive_denominator": str(sp.factor(denominator)),
                "control_count": len(controls),
                "all_controls_coefficientwise_nonnegative": True,
                "controls": control_records,
            }
        )

    assert total_controls == 86
    payload = {
        "kind": "repeated_meixner_nonnegative_final_diagonal_disk_theorem",
        "date": "2026-08-09",
        "status": "PASS_EXACT_ALL_RANK_REPEATED_MEIXNER_BSTAR_NONNEGATIVE_THEOREM",
        "scope": (
            "analytic all-rank theorem for the repeated-benign symmetric-outlier "
            "region b_*>=0; the b_*<0 region and arbitrary benign lists remain"
        ),
        "energy_identity": "|z|^2=q+b_*mu-Var_J",
        "meixner_norm_bound": (
            "mu<=lambda_max(J)<=U=(sqrt(d(N-1)/4)+"
            "sqrt(r(d+4)/4))^2"
        ),
        "parameterization": {
            "B": "3*r+4+reserve_slack",
            "b_*": "(r+1)*simplex_b",
            "Bd/4": "(r+1)*(1-simplex_b)*simplex_d",
            "t": "2*(r+1-Bd/4-b_*)/N",
            "q_nonnegative_chart": (
                "simplex_b=projective*K*(1-simplex_d)^2/H"
            ),
            "K": str(K),
            "H": str(H),
        },
        "conclusion": (
            "R^2-q-b_*(u_r+ell_r)>=2*b_*sqrt(u_r*ell_r), "
            "hence every possible nonreal eigenvalue satisfies |z|^2<=R^2."
        ),
        "certificate_control_count": total_controls,
        "parameter_coefficient_count": total_parameter_coefficients,
        "minimum_parameter_coefficient": str(global_minimum_coefficient),
        "certificates": certificate_records,
        "remaining_regions": [
            "repeated benign source with b_*<0 and q>R^2",
            "lifting the symmetric-boundary theorem from repeated to arbitrary benign parameters",
            "the topological continuation from the symmetric boundary to the full outlier square",
        ],
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"controls={total_controls}")
    print(f"parameter_coefficients={total_parameter_coefficients}")
    print(f"report={REPORT}")


if __name__ == "__main__":
    main()
