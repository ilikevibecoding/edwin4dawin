#!/usr/bin/env python3
"""Exact complementary type-I/type-II pairing certificate.

Let P_(N-l) be the monic type-II polynomial in the shifted system at
derivative order l, and let Q_(N-k) be the type-I function in the shifted
system at order k.  The universal Laplace tail makes their pairing triangular.
For R=k-l+1>=0 it has a closed Pochhammer product; for R<0 it vanishes by
the defining type-I moments.  At the Erdos complementary orders l=d-k, R is
even, hence every nonzero pairing is positive.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import sympy as sp

from verify_defect3_nikishin_step_line import chain_parameters
from verify_defect3_universal_typeI_laplace import gauss_coefficient


OUT = Path("defect3_typeI_typeII_pairing_certificate_20260803.json")


@lru_cache(maxsize=None)
def monic_typeII_coefficients(N: int, derivative_order: int) -> tuple[sp.Expr, ...]:
    degree = N - derivative_order
    _, a, b, _ = chain_parameters(N, derivative_order)
    upper = N + derivative_order - 2
    raw = [
        sp.cancel(
            sp.rf(-degree, j)
            * sp.rf(upper, j)
            / (sp.rf(a + 1, j) * sp.rf(b + 1, j) * sp.factorial(j))
        )
        for j in range(degree + 1)
    ]
    lead = raw[-1]
    return tuple(sp.cancel(value / lead) for value in raw)


@lru_cache(maxsize=None)
def typeI_moment(N: int, derivative_order: int, power: int) -> sp.Expr:
    n = N - derivative_order
    if power < n - 1:
        return sp.Integer(0)
    q = power - (n - 1)
    return sp.cancel(
        sp.factorial(power) / sp.factorial(n - 1) * gauss_coefficient(N, q)
    )


def direct_pairing(N: int, k: int, ell: int) -> sp.Expr:
    coefficients = monic_typeII_coefficients(N, ell)
    return sp.factor(
        sum(
            coefficient * typeI_moment(N, k, power)
            for power, coefficient in enumerate(coefficients)
        )
    )


@lru_cache(maxsize=None)
def monic_consecutive_coefficients(N: int, derivative_order: int) -> tuple[sp.Expr, ...]:
    """Monic form of g_(N-1)^(derivative_order) in the order-k system."""
    degree = N - derivative_order - 1
    _, a, b, _ = chain_parameters(N, derivative_order)
    upper = N + derivative_order - 3
    raw = [
        sp.cancel(
            sp.rf(-degree, j)
            * sp.rf(upper, j)
            / (sp.rf(a + 1, j) * sp.rf(b + 1, j) * sp.factorial(j))
        )
        for j in range(degree + 1)
    ]
    lead = raw[-1]
    return tuple(sp.cancel(value / lead) for value in raw)


def direct_consecutive_pairing(N: int, k: int, ell: int) -> sp.Expr:
    coefficients = monic_consecutive_coefficients(N, ell)
    return sp.factor(
        sum(
            coefficient * typeI_moment(N, k, power)
            for power, coefficient in enumerate(coefficients)
        )
    )


def closed_consecutive_pairing(N: int, k: int, ell: int) -> sp.Expr:
    R = k - ell
    if R < 0:
        return sp.Integer(0)
    degree = N - ell - 1
    return sp.factor(
        (-1) ** R
        * sp.binomial(degree, R)
        * sp.rf(N - R - 2, R)
        * sp.rf(sp.Rational(2 * N - 2 * R - 3, 2), R)
        * sp.rf(-2 * R, R)
        / (
            sp.rf(2 * N - R - 4, R)
            * sp.rf(2 * N - 2 * R - 4, R)
        )
    )


def direct_consecutive_balanced_4f3(N: int, R: int) -> sp.Expr:
    return sp.factor(
        sum(
            sp.rf(-R, j)
            * sp.rf(2 * N - R - 4, j)
            * sp.rf(N - 2, j)
            * sp.rf(sp.Rational(2 * N - 3, 2), j)
            / (
                sp.rf(N - R - 2, j)
                * sp.rf(sp.Rational(2 * N - 2 * R - 3, 2), j)
                * sp.rf(2 * N - 3, j)
                * sp.factorial(j)
            )
            for j in range(R + 1)
        )
    )


def collapsed_consecutive_balanced_4f3(N: int, R: int) -> sp.Expr:
    return sp.factor(sp.rf(-2 * R, R) / sp.rf(2 * N - 2 * R - 4, R))


def closed_pairing(N: int, k: int, ell: int) -> sp.Expr:
    R = k - ell + 1
    if R < 0:
        return sp.Integer(0)
    degree = N - ell
    return sp.factor(
        (-1) ** R
        * sp.binomial(degree, R)
        * sp.rf(N - R - 1, R)
        * sp.rf(sp.Rational(2 * N - 2 * R - 1, 2), R)
        * sp.rf(2 - 2 * R, R)
        / (
            sp.rf(2 * N - R - 2, R)
            * sp.rf(2 * N - 2 * R - 2, R)
        )
    )


def collapsed_balanced_4f3(N: int, R: int) -> sp.Expr:
    return sp.factor(sp.rf(2 - 2 * R, R) / sp.rf(2 * N - 2 * R - 2, R))


def direct_balanced_4f3(N: int, R: int) -> sp.Expr:
    return sp.factor(
        sum(
            sp.rf(-R, j)
            * sp.rf(2 * N - R - 2, j)
            * sp.rf(N - 2, j)
            * sp.rf(sp.Rational(2 * N - 3, 2), j)
            / (
                sp.rf(N - R - 1, j)
                * sp.rf(sp.Rational(2 * N - 2 * R - 1, 2), j)
                * sp.rf(2 * N - 3, j)
                * sp.factorial(j)
            )
            for j in range(R + 1)
        )
    )


def main() -> None:
    full_pairing_checks = 0
    balanced_sum_checks = 0
    sign_checks = 0
    endpoint_positive_checks = 0
    consecutive_pairing_checks = 0
    consecutive_balanced_sum_checks = 0
    consecutive_sign_checks = 0

    for N in range(4, 61):
        for R in range(0, N - 1):
            assert direct_balanced_4f3(N, R) == collapsed_balanced_4f3(N, R)
            balanced_sum_checks += 1
        for R in range(0, N - 2):
            assert (
                direct_consecutive_balanced_4f3(N, R)
                == collapsed_consecutive_balanced_4f3(N, R)
            )
            consecutive_balanced_sum_checks += 1

        if N <= 30:
            for k in range(2, N):
                for ell in range(2, N):
                    actual = direct_pairing(N, k, ell)
                    claimed = closed_pairing(N, k, ell)
                    assert sp.cancel(actual - claimed) == 0
                    full_pairing_checks += 1
                    R = k - ell + 1
                    if R < 0:
                        assert claimed == 0
                    elif R == 1:
                        assert claimed == 0
                    elif R == 0 or R >= 2:
                        assert claimed > 0
                    sign_checks += 1
                    actual_consecutive = direct_consecutive_pairing(N, k, ell)
                    claimed_consecutive = closed_consecutive_pairing(N, k, ell)
                    assert sp.cancel(actual_consecutive - claimed_consecutive) == 0
                    consecutive_pairing_checks += 1
                    consecutive_gap = k - ell
                    if consecutive_gap < 0:
                        assert claimed_consecutive == 0
                    else:
                        assert claimed_consecutive > 0
                    consecutive_sign_checks += 1

    endpoint_records = []
    for m in range(1, 101):
        N = 3 * m + 3
        d = 2 * m + 3
        local = 0
        for k in range(2, d - 1):
            ell = d - k
            R = k - ell + 1
            value = closed_pairing(N, k, ell)
            if R < 0:
                assert value == 0
            else:
                assert R % 2 == 0
                assert value > 0
                endpoint_positive_checks += 1
                local += 1
        endpoint_records.append({"m": m, "positive_complementary_pairings": local})

    report = {
        "kind": "defect3_typeI_typeII_pairing_certificate",
        "status": "PASS_EXACT_COMPLEMENTARY_PAIRING_PRODUCT",
        "full_pairing_checks": full_pairing_checks,
        "balanced_4f3_collapse_checks": balanced_sum_checks,
        "triangular_nonnegative_sign_checks": sign_checks,
        "endpoint_positive_checks": endpoint_positive_checks,
        "consecutive_pairing_checks": consecutive_pairing_checks,
        "consecutive_balanced_4f3_collapse_checks": consecutive_balanced_sum_checks,
        "consecutive_nonnegative_sign_checks": consecutive_sign_checks,
        "ranges": {
            "balanced_sum_N": [4, 60],
            "full_pairing_N": [4, 30],
            "endpoint_m": [1, 100],
        },
        "closed_pairing": (
            "(-1)^R*binom(N-l,R)*(N-R-1)_R*(N-R-1/2)_R*(2-2R)_R/"
            "((2N-R-2)_R*(2N-2R-2)_R), R=k-l+1"
        ),
        "balanced_4f3_collapse": "(2-2R)_R/(2N-2R-2)_R",
        "consecutive_balanced_4f3_collapse": "(-2R)_R/(2N-2R-4)_R",
        "consequence": (
            "The shifted type-I/type-II pairing matrix is triangular and nonnegative "
            "with its first subdiagonal zero.  Along the Erdos complementary "
            "anti-diagonal all nonzero entries have even gap and are positive."
        ),
        "endpoint_records": endpoint_records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_COMPLEMENTARY_PAIRING_PRODUCT")
    print(json.dumps({key: value for key, value in report.items() if key != "endpoint_records"}, indent=2))


if __name__ == "__main__":
    main()
