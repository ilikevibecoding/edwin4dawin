#!/usr/bin/env python3
"""Test whether three defect-one seeds are one Jacobi principal-minor chain."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("defect1_jacobi_chain_probe_20260803.json")


def monic_seed(n: int) -> sp.Poly:
    poly = sp.Poly(sp.cancel(hypergeometric_form(n, 1) / X), X)
    return sp.Poly(poly.as_expr() / poly.LC(), X)


def main() -> None:
    records = []
    for n in range(4, 31):
        current = monic_seed(n)
        previous = monic_seed(n - 1)
        actual_two_back = monic_seed(n - 2)
        quotient, remainder = sp.div(current, previous, domain=sp.QQ)
        beta = -remainder.LC()
        euclidean_two_back = sp.Poly(-remainder.as_expr() / beta, X)
        proportional = euclidean_two_back == actual_two_back
        records.append(
            {
                "N": n,
                "first_quotient": str(quotient.as_expr()),
                "first_beta_squared": str(beta),
                "euclidean_next_equals_actual_N_minus_2": proportional,
                "difference_degree": (
                    -1
                    if proportional
                    else int((euclidean_two_back - actual_two_back).degree())
                ),
            }
        )

    report = {
        "status": "DEFECT1_JACOBI_CHAIN_PROBE",
        "all_three_seed_matches": all(
            record["euclidean_next_equals_actual_N_minus_2"] for record in records
        ),
        "records": records,
        "scope": "Exact finite algebraic reconnaissance.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
