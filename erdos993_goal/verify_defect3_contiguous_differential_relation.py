#!/usr/bin/env python3
"""Exact certificate for the consecutive-degree defect-3 umbral relation.

For g_N = U(P_N^(N-3)) and h_N = g_{N-1}, certify

  2(N-1)(N-3) h_N
    = (2N(N-1)-NX) g_N
      + (X^2-2(2N-1)X) g_N'
      + 4X^2 g_N''.

Besides direct exact polynomial checks, the certificate reduces the identity
to one symbolic coefficient identity valid for an arbitrary coefficient k.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
)


OUT = Path("defect3_contiguous_differential_relation_certificate_20260802.json")


def main() -> None:
    N, k = sp.symbols("N k", integer=True, nonnegative=True)
    j = k + 2
    r = N - 2

    # If c_k is the coefficient of X^(k+2) in g_N, then these are
    # d_k/c_k for h_N and c_(k-1)/c_k, respectively.  The latter formula
    # also evaluates to zero at k=0, consistently with c_(-1)=0.
    h_over_g = (r - k) / (r + k + 1)
    previous_over_current = (
        4 * k * (k + sp.Rational(1, 2)) * (k + 2)
        / ((r - k + 1) * (r + k + 1))
    )

    diagonal_multiplier = (
        2 * N * (N - 1)
        - 2 * (2 * N - 1) * j
        + 4 * j * (j - 1)
    )
    subdiagonal_multiplier = j - 1 - N
    coefficient_residual = sp.factor(
        diagonal_multiplier
        + subdiagonal_multiplier * previous_over_current
        - 2 * (N - 1) * (N - 3) * h_over_g
    )
    assert coefficient_residual == 0

    checked = []
    for n_value in range(4, 41):
        g = hypergeometric_form(n_value, 3)
        h = hypergeometric_form(n_value - 1, 3)
        rhs = sp.expand(
            (2 * n_value * (n_value - 1) - n_value * X) * g
            + (X**2 - 2 * (2 * n_value - 1) * X) * sp.diff(g, X)
            + 4 * X**2 * sp.diff(g, X, 2)
        )
        lhs = sp.expand(2 * (n_value - 1) * (n_value - 3) * h)
        assert sp.expand(lhs - rhs) == 0
        checked.append(n_value)

    report = {
        "kind": "defect3_contiguous_differential_relation_certificate",
        "date": "2026-08-02",
        "status": "PASS_SYMBOLIC_COEFFICIENT_IDENTITY",
        "relation": (
            "2(N-1)(N-3)g_(N-1) = "
            "(2N(N-1)-NX)g_N + (X^2-2(2N-1)X)g_N' + 4X^2g_N''"
        ),
        "coefficient_ratios": {
            "g_(N-1)[X^(k+2)]/g_N[X^(k+2)]": "(N-2-k)/(N-1+k)",
            "g_N[X^(k+1)]/g_N[X^(k+2)]": (
                "4k(k+1/2)(k+2)/((N-1-k)(N-1+k))"
            ),
        },
        "symbolic_residual": str(coefficient_residual),
        "direct_exact_check_range": [checked[0], checked[-1]],
        "direct_exact_checks": len(checked),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
