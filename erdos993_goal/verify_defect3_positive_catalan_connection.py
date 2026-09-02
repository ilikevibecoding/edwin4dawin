#!/usr/bin/env python3
"""Exact positive Catalan connection between the two type-II chains.

In the x=-X/4 variable, let P_l be the monic form of g_N^(l), and H_l the
monic form of g_(N-1)^(l).  Combining the Catalan lowering operator with the
Hahn derivative law gives

  H_l = sum_{j=0}^{N-l-1} (N-l-1)_falling_j C_(j+1)/4^j P_(l+1+j).

All connection coefficients are nonnegative (strictly positive on support).
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_defect3_typeI_typeII_pairing import (
    monic_consecutive_coefficients,
    monic_typeII_coefficients,
)


OUT = Path("defect3_positive_catalan_connection_certificate_20260803.json")


def falling(value: int, order: int) -> sp.Integer:
    return sp.factorial(value) // sp.factorial(value - order)


def connection_coefficient(remaining_degree: int, index: int) -> sp.Expr:
    return sp.cancel(
        falling(remaining_degree, index) * sp.catalan(index + 1) / 4**index
    )


def pad(coefficients: tuple[sp.Expr, ...], length: int) -> list[sp.Expr]:
    return list(coefficients) + [sp.Integer(0)] * (length - len(coefficients))


def main() -> None:
    coefficient_checks = 0
    polynomial_checks = 0
    positivity_checks = 0
    records = []
    for N in range(4, 61):
        local = 0
        for ell in range(2, N):
            remaining = N - ell - 1
            target = list(monic_consecutive_coefficients(N, ell))
            claimed = [sp.Integer(0)] * (remaining + 1)
            for index in range(remaining + 1):
                coefficient = connection_coefficient(remaining, index)
                assert coefficient > 0
                positivity_checks += 1
                order = ell + 1 + index
                basis = (
                    (sp.Integer(1),)
                    if order == N
                    else monic_typeII_coefficients(N, order)
                )
                basis_padded = pad(basis, remaining + 1)
                for power, value in enumerate(basis_padded):
                    claimed[power] += coefficient * value
                    coefficient_checks += 1
            assert all(sp.cancel(left - right) == 0 for left, right in zip(target, claimed))
            polynomial_checks += remaining + 1
            local += remaining + 1
        records.append({"N": N, "polynomial_coefficient_checks": local})

    report = {
        "kind": "defect3_positive_catalan_connection_certificate",
        "status": "PASS_EXACT_POSITIVE_CATALAN_CONNECTION",
        "N_range": [4, 60],
        "expanded_basis_coefficient_operations": coefficient_checks,
        "polynomial_coefficient_checks": polynomial_checks,
        "positive_connection_coefficient_checks": positivity_checks,
        "identity": (
            "H_l=sum_(j=0)^(N-l-1) falling(N-l-1,j)*Catalan(j+1)/4^j "
            "times P_(l+1+j)"
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_POSITIVE_CATALAN_CONNECTION")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
