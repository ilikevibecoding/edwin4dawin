#!/usr/bin/env python3
"""Exact Nikishin step-line identification of the defect-three pair.

For each N, the double derivatives of g_N and g_{N-1} are consecutive
type-II polynomials in the Lima--Loureiro Hahn-classical 2-orthogonal family.
Their common derivative chain stays consecutive under the published Hahn
property.  This script verifies the hypergeometric parameter identities and
the complete polynomial identities over exact rationals.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("defect3_nikishin_step_line_certificate_20260803.json")


def terminating_2f2(
    degree: int,
    upper: sp.Rational,
    lower_first: sp.Rational,
    lower_second: sp.Rational,
) -> sp.Expr:
    return sp.expand(
        sum(
            sp.rf(-degree, j)
            * sp.rf(upper, j)
            / (
                sp.rf(lower_first, j)
                * sp.rf(lower_second, j)
                * sp.factorial(j)
            )
            * (-X / 4) ** j
            for j in range(degree + 1)
        )
    )


def mop_raw(
    degree: int,
    delta: int,
    a: sp.Rational,
    b: sp.Rational,
    c: sp.Rational,
) -> sp.Expr:
    upper = c + b + 1 + (degree + delta) // 2
    return terminating_2f2(degree, upper, a + 1, b + 1)


def defect3_derivative_coefficient(N: int, derivative_order: int, power: int) -> sp.Rational:
    original_power = derivative_order + power
    if original_power > N:
        return sp.Integer(0)
    return sp.Rational(
        sp.factorial(N + original_power - 3),
        sp.factorial(N - original_power)
        * sp.factorial(2 * original_power - 3)
        * sp.factorial(power),
    )


def mop_coefficient(
    degree: int,
    upper: sp.Rational,
    lower_first: sp.Rational,
    lower_second: sp.Rational,
    power: int,
) -> sp.Rational:
    return sp.cancel(
        sp.rf(-degree, power)
        * sp.rf(upper, power)
        * sp.Rational(-1, 4) ** power
        / (
            sp.rf(lower_first, power)
            * sp.rf(lower_second, power)
            * sp.factorial(power)
        )
    )


def chain_parameters(N: int, derivative_order: int):
    ell = derivative_order - 2
    delta0 = N % 2
    delta = delta0 if ell % 2 == 0 else 1 - delta0
    a = sp.Integer(ell)
    b = sp.Rational(1, 2) + ell
    c0 = sp.floor(sp.Rational(N, 2)) - sp.Rational(1, 2)
    c = c0 + (ell + delta0) // 2
    return int(delta), a, b, sp.Rational(c)


def expected_upper(N: int, derivative_order: int, previous: bool = False):
    return N + derivative_order - (3 if previous else 2)


def main() -> None:
    polynomial_checks = 0
    parameter_checks = 0
    derivative_shift_checks = 0
    records = []

    for N in range(4, 61):
        delta0, a0, b0, c0 = chain_parameters(N, 2)
        assert a0 == 0 and b0 == sp.Rational(1, 2)
        assert c0 > max(sp.Integer(0), a0 - b0)

        local = 0
        for k in range(2, N):
            degree = N - k
            delta, a, b, c = chain_parameters(N, k)
            assert delta == degree % 2

            upper_g = c + b + 1 + (degree + delta) // 2
            upper_h = c + b + 1 + (degree - 1 + delta) // 2
            assert upper_g == expected_upper(N, k, previous=False)
            assert upper_h == expected_upper(N, k, previous=True)
            parameter_checks += 2

            g_constant = defect3_derivative_coefficient(N, k, 0)
            h_constant = defect3_derivative_coefficient(N - 1, k, 0)
            for power in range(degree + 1):
                actual = sp.cancel(defect3_derivative_coefficient(N, k, power) / g_constant)
                claimed = mop_coefficient(degree, upper_g, a + 1, b + 1, power)
                assert actual == claimed
                polynomial_checks += 1
                local += 1
            for power in range(degree):
                actual = sp.cancel(defect3_derivative_coefficient(N - 1, k, power) / h_constant)
                claimed = mop_coefficient(degree - 1, upper_h, a + 1, b + 1, power)
                assert actual == claimed
                polynomial_checks += 1
                local += 1

            if k + 1 < N:
                next_delta, next_a, next_b, next_c = chain_parameters(N, k + 1)
                assert next_delta == 1 - delta
                assert next_a == a + 1
                assert next_b == b + 1
                assert next_c == c + delta
                derivative_shift_checks += 1

        records.append(
            {
                "N": N,
                "initial_degree": N - 2,
                "step_line_delta": delta0,
                "a": str(a0),
                "b": str(b0),
                "c": str(c0),
                "polynomial_checks": local,
            }
        )

    report = {
        "kind": "defect3_nikishin_step_line_certificate",
        "date": "2026-08-03",
        "status": "PASS_EXACT_NIKISHIN_STEP_LINE_IDENTIFICATION",
        "N_range": [4, 60],
        "polynomial_identity_checks": polynomial_checks,
        "hypergeometric_parameter_checks": parameter_checks,
        "published_derivative_shift_checks": derivative_shift_checks,
        "identification": {
            "initial": (
                "For n=N-2, delta=N mod 2, a=0, b=1/2, "
                "c=floor(N/2)-1/2, the monic forms of g_N''(-4x) "
                "and g_(N-1)''(-4x) are P_n^delta(x;a,b,c) and "
                "P_(n-1)^delta(x;a,b,c)."
            ),
            "derivative_chain": (
                "At order k>=2 put ell=k-2.  Both consecutive polynomials "
                "have the common shifted parameters a=ell, b=ell+1/2, "
                "delta=(N-k) mod 2, and "
                "c=floor(N/2)-1/2+floor((ell+(N mod 2))/2)."
            ),
            "theorem_used": (
                "Lima--Loureiro: P_(n+1)^delta derivative equals "
                "(n+1) P_n^(1-delta)(a+1,b+1,c+delta)."
            ),
        },
        "consequence": (
            "The exact defect-three pair, after its common double zero is "
            "removed by differentiation, is a consecutive type-II pair in "
            "one Nikishin step-line system, and remains so throughout the "
            "common derivative chain.  This supplies a multiple-orthogonal "
            "kernel route but does not by itself prove endpoint stability."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in (
        "status",
        "polynomial_identity_checks",
        "hypergeometric_parameter_checks",
        "published_derivative_shift_checks",
    )}, indent=2))


if __name__ == "__main__":
    main()
