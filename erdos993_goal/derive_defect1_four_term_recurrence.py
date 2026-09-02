#!/usr/bin/env python3
"""Derive the degree recurrence of the monic defect-one seed g_N/X."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("defect1_four_term_recurrence_20260803.json")


def monic_seed(n: int) -> sp.Poly:
    raw = sp.Poly(sp.cancel(hypergeometric_form(n, 1) / X), X)
    return sp.Poly(raw.as_expr() / raw.LC(), X)


def main() -> None:
    records = []
    for n in range(4, 41):
        p0 = monic_seed(n)
        p1 = monic_seed(n - 1)
        p2 = monic_seed(n - 2)
        p3 = monic_seed(n - 3)

        quotient, remainder = sp.div(p0, p1, domain=sp.QQ)
        assert sp.expand(quotient.as_expr() - (X + 4 * (n - 1))) == 0
        beta = -remainder.LC()
        remainder_after_beta = sp.Poly(
            remainder.as_expr() + beta * p2.as_expr(), X
        )
        gamma = -remainder_after_beta.LC() if not remainder_after_beta.is_zero else 0
        residual = sp.Poly(
            remainder_after_beta.as_expr() + gamma * p3.as_expr(), X
        )
        records.append(
            {
                "N": n,
                "diagonal_shift": 4 * (n - 1),
                "beta": str(beta),
                "gamma": str(gamma),
                "residual_zero": residual.is_zero,
                "residual_degree": -1 if residual.is_zero else residual.degree(),
            }
        )

    n = sp.symbols("N", integer=True, positive=True)
    beta_formula = 7 * (n - 1) * (n - 2)
    # Interpolate the observed gamma values and factor the result.
    gamma_values = [(record["N"], sp.Integer(record["gamma"])) for record in records]
    gamma_formula = sp.factor(sp.interpolate(gamma_values[:8], n))
    assert all(
        sp.Integer(record["beta"]) == beta_formula.subs(n, record["N"])
        for record in records
    )
    assert all(
        sp.Integer(record["gamma"]) == gamma_formula.subs(n, record["N"])
        for record in records
    )

    report = {
        "status": (
            "PASS_EXACT_FOUR_TERM_RECURRENCE"
            if all(record["residual_zero"] for record in records)
            else "NO_FOUR_TERM_RECURRENCE"
        ),
        "recurrence": (
            "p_N=(X+4(N-1))p_(N-1)-beta_N p_(N-2)-gamma_N p_(N-3)"
        ),
        "beta_formula": str(beta_formula),
        "gamma_formula": str(gamma_formula),
        "records": records,
        "scope": "Finite exact derivation followed by an all-record formula check.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
