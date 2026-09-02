#!/usr/bin/env python3
"""All-order differential relation for consecutive defect-one seeds."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("defect1_contiguous_differential_relation_20260803.json")


def main() -> None:
    n, j = sp.symbols("N j", integer=True, positive=True)
    h_over_g = (n - j) / (n + j - 1)
    previous_over_current = (
        (2 * j - 1) * (2 * j - 2) * j
        / ((n + j - 1) * (n - j + 1))
    )
    diagonal = 2 * n**2 - 2 * (2 * n - 1) * j + 4 * j * (j - 1)
    subdiagonal = j - 1 - n
    residual = sp.factor(
        diagonal
        + subdiagonal * previous_over_current
        - 2 * n * (n - 1) * h_over_g
    )
    assert residual == 0

    direct_checks = []
    second_step_checks = []
    for n_value in range(3, 61):
        g = hypergeometric_form(n_value, 1)
        h = hypergeometric_form(n_value - 1, 1)
        relation = sp.expand(
            (2 * n_value**2 - n_value * X) * g
            + (X**2 - 2 * (2 * n_value - 1) * X) * sp.diff(g, X)
            + 4 * X**2 * sp.diff(g, X, 2)
            - 2 * n_value * (n_value - 1) * h
        )
        assert relation == 0
        direct_checks.append(n_value)

        if n_value >= 4:
            previous2 = hypergeometric_form(n_value - 2, 1)
            relation2 = sp.expand(
                (2 * (n_value - 1) ** 2 - (n_value - 1) * X) * h
                + (X**2 - 2 * (2 * n_value - 3) * X) * sp.diff(h, X)
                + 4 * X**2 * sp.diff(h, X, 2)
                - 2 * (n_value - 1) * (n_value - 2) * previous2
            )
            assert relation2 == 0
            second_step_checks.append(n_value)

    report = {
        "status": "PASS_ALL_ORDER_DEFECT1_CONTIGUOUS_DIFFERENTIAL_RELATION",
        "relation": (
            "2N(N-1)g_(N-1)=(2N^2-NX)g_N+"
            "(X^2-2(2N-1)X)g_N'+4X^2g_N''"
        ),
        "coefficient_ratios": {
            "g_(N-1)[X^j]/g_N[X^j]": "(N-j)/(N+j-1)",
            "g_N[X^(j-1)]/g_N[X^j]": (
                "j(2j-1)(2j-2)/((N+j-1)(N-j+1))"
            ),
        },
        "symbolic_coefficient_residual": str(residual),
        "direct_check_range": [direct_checks[0], direct_checks[-1]],
        "direct_checks": len(direct_checks),
        "second_step_checks": len(second_step_checks),
        "consequence": (
            "g_(N-2) is obtained by applying the same second-order operator "
            "with N replaced by N-1 to g_(N-1), so it lies in the span of "
            "g_N and its first four derivatives over R(X)."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
