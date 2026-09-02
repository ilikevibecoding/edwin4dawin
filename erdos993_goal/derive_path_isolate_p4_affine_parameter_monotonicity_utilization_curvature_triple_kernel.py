#!/usr/bin/env python3
"""Derive the universal triple-copy kernel for utilization curvature."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


d = sp.symbols("d", integer=True, positive=True)
x1, x2, x3 = sp.symbols("x1 x2 x3", positive=True)
x = (x1, x2, x3)


def insertion(i: int) -> sp.Expr:
    j, k = [index for index in range(3) if index != i]
    return sp.expand(
        d * (d + 1) * x[i] ** 2 * (x[j] + x[k])
        - 2 * (d**2 - 1) * x[i] * (x[j] ** 2 + x[k] ** 2)
        + d * (d - 1) * x[j] * x[k] * (x[j] + x[k])
    )


def main() -> None:
    insertions = [insertion(i) for i in range(3)]
    cyclic_sum = sp.factor(sum(insertions))
    expected = 2 * sum(
        x[i] ** 2 * x[j]
        for i in range(3) for j in range(3) if i != j
    )
    assert sp.expand(cyclic_sum - expected) == 0
    assert sp.Poly(cyclic_sum, d).degree() == 0
    difference_factors = {
        f"B{i + 1}_minus_B{j + 1}": str(sp.factor(insertions[i] - insertions[j]))
        for i, j in ((0, 1), (1, 2), (0, 2))
    }
    report = {
        "status": "PASS_UTILIZATION_CURVATURE_TRIPLE_KERNEL_IDENTITY",
        "definition": (
            "B_i=d(d+1)x_i^2(x_j+x_k)-2(d^2-1)x_i(x_j^2+x_k^2)"
            "+d(d-1)x_jx_k(x_j+x_k), {i,j,k}={1,2,3}."
        ),
        "cyclic_sum": str(cyclic_sum),
        "cyclic_sum_independent_of_d": True,
        "cyclic_sum_strictly_positive_for_positive_x": True,
        "difference_factors": difference_factors,
        "coefficient_extraction_identity": (
            "For f_j=-Phi_j(L), s_j=Phi_j(S), g_j=(n-j)s_j and d=n-j, "
            "2*(f_{j+1}g_jg_{j-1}-2f_jg_{j+1}g_{j-1}+"
            "f_{j-1}g_{j+1}g_j), after removing the positive common "
            "binomial and baseline factors, is the cyclic extraction of "
            "(1/3) sum_i (-L_i)S_jS_k B_i with x_i=w_i/(1+z_i). "
            "Equivalently, the unaveraged symmetric tensor extracts to "
            "six times the curvature numerator."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "utilization_curvature_triple_kernel_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
