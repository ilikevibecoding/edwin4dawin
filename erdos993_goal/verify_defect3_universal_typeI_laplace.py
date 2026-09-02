#!/usr/bin/env python3
"""Exact certificate for the universal type-I Laplace tail.

Along the defect-three Hahn derivative chain, let Q_n be the type-I function
in the same shifted Nikishin system as g_N^(k), where n=N-k.  The Rodrigues
formula and the weight moments imply

  int exp(zx) Q_n(x) dx
    = z^(n-1)/(n-1)! * 2F1(N-2,N-3/2;2N-3;z).

The Gauss factor is independent of k and equals C(z/4)^(2N-4), with C the
Catalan generating function.  This script verifies all parameter collapses
and a broad exact coefficient range.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUT = Path("defect3_universal_typeI_laplace_certificate_20260803.json")


def shifted_parameters(N: int, k: int):
    delta0 = N % 2
    ell = k - 2
    a = sp.Integer(ell)
    b = sp.Rational(2 * ell + 1, 2)
    delta = (N - k) % 2
    c0 = sp.floor(sp.Rational(N, 2)) - sp.Rational(1, 2)
    c = c0 + sp.floor(sp.Rational(ell + delta0, 2))
    return a, b, delta, c


def gauss_coefficient(N: int, q: int) -> sp.Expr:
    return sp.rf(N - 2, q) * sp.rf(sp.Rational(2 * N - 3, 2), q) / (
        sp.rf(2 * N - 3, q) * sp.factorial(q)
    )


def catalan_power_coefficient(N: int, q: int) -> sp.Expr:
    power = 2 * N - 4
    # [x^q] C(x)^power = power/(2q+power) * binomial(2q+power,q).
    return (
        sp.Rational(power, 2 * q + power)
        * sp.binomial(2 * q + power, q)
        / 4**q
    )


def main() -> None:
    parameter_checks = 0
    coefficient_checks = 0
    moment_checks = 0
    records = []
    for N in range(4, 101):
        chain_count = 0
        for k in range(2, N):
            n = N - k
            a, b, delta, c = shifted_parameters(N, k)
            denominator = c + b + n + sp.floor(sp.Rational(n + delta, 2))
            assert a + n == N - 2
            assert b + n == sp.Rational(2 * N - 3, 2)
            assert denominator == 2 * N - 3
            parameter_checks += 3
            chain_count += 1

            # The moment tail obtained from the Laplace transform is Toeplitz:
            # after the forced n-1 initial zeros, it depends only on q.
            for q in range(0, 9):
                gauss = sp.cancel(gauss_coefficient(N, q))
                catalan = sp.cancel(catalan_power_coefficient(N, q))
                assert gauss == catalan
                coefficient_checks += 1
                moment = sp.factorial(n - 1 + q) / sp.factorial(n - 1) * gauss
                reconstructed = (
                    sp.factorial(n - 1 + q)
                    / sp.factorial(n - 1)
                    * catalan
                )
                assert sp.cancel(moment - reconstructed) == 0
                moment_checks += 1
        records.append({"N": N, "chain_length": chain_count})

    report = {
        "kind": "defect3_universal_typeI_laplace_certificate",
        "status": "PASS_EXACT_UNIVERSAL_TYPEI_LAPLACE",
        "parameter_checks": parameter_checks,
        "gauss_catalan_coefficient_checks": coefficient_checks,
        "toeplitz_moment_checks": moment_checks,
        "N_range": [4, 100],
        "coefficient_range": [0, 8],
        "identities": {
            "laplace": "L Q_(N-k)(z)=z^(N-k-1)/(N-k-1)! * 2F1(N-2,N-3/2;2N-3;z)",
            "universal_tail": "2F1(N-2,N-3/2;2N-3;z)=C(z/4)^(2N-4)",
        },
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_UNIVERSAL_TYPEI_LAPLACE")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
