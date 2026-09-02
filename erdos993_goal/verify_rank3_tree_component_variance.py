#!/usr/bin/env python3
"""Symbolically verify the rank-three tree component-variance proof."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


def main() -> None:
    n, s1, s2, s3, edge_product = sp.symbols(
        "n s1 s2 s3 edge_product"
    )
    mass = (n - 1) * (n - 2)
    c0 = s2 - s1
    c1 = 2 * edge_product - s2
    mean_d = ((n - 1) * s1 - s2) / mass
    variance_d = (
        ((n - 1) * s2 - s3) / mass - mean_d**2
    )
    mean_c = ((n - 1) * c0 - c1) / mass
    covariance_d_z = (
        2 * c1 / mass - mean_d * 2 * c0 / mass
    )
    payment = sp.factor(
        mean_c - variance_d + 2 * covariance_d_z
    )

    N, x2, x3, q = sp.symbols(
        "N x2 x3 q", nonnegative=True
    )
    substitutions = {
        n: N + 2,
        s1: 2 * (N + 1),
        s2: x2 + 3 * N + 2,
        s3: x3 + 3 * x2 + 4 * N + 2,
        edge_product: q + x2 + 2 * N + 1,
    }
    payment_numerator = sp.factor(
        payment.subs(substitutions) * (N * (N + 1)) ** 2
    )
    expected_numerator = (
        2 * N**4
        - 3 * N**3
        + N * (N + 1) * x3
        + 6 * N * (N + 1) * q
        + (-6 * N**2 + 4 * N) * x2
        + 5 * x2**2
    )
    assert sp.expand(payment_numerator - expected_numerator) == 0

    a, b = sp.symbols("a b", nonnegative=True)
    normalized = sp.factor(
        expected_numerator.subs(
            {x2: N**2 * a, x3: N**3 * b, q: 0}
        )
        / N**3
    )
    expected_normalized = (
        N * (N + 1) * b
        + 5 * N * a**2
        + (4 - 6 * N) * a
        + 2 * N
        - 3
    )
    assert sp.expand(normalized - expected_normalized) == 0

    # Cauchy gives b >= a^2.  The resulting quadratic has this
    # globally nonnegative minimum for every N >= 2.
    quadratic = sp.factor(expected_normalized.subs(b, a**2))
    vertex = sp.factor((6 * N - 4) / (2 * N * (N + 6)))
    minimum = sp.factor(quadratic.subs(a, vertex))
    expected_minimum = (
        2 * (N - 2) * (N + 1) ** 2 / (N * (N + 6))
    )
    assert sp.factor(minimum - expected_minimum) == 0

    report = {
        "status": "PASS_SYMBOLIC_RANK3_TREE_COMPONENT_VARIANCE",
        "scope": (
            "Symbolic verification of the algebraic proof of CV for "
            "every tree at rank three and order n >= 4."
        ),
        "definitions": {
            "N": "n-2",
            "x_v": "deg(v)-1",
            "X2": "sum_v x_v^2",
            "X3": "sum_v x_v^3",
            "Q": "sum_{uv in E} x_u x_v",
            "a": "X2/N^2",
            "b": "X3/N^3",
        },
        "payment_numerator": str(payment_numerator),
        "normalized_after_Q_is_dropped": str(normalized),
        "cauchy_step": "b >= a^2",
        "quadratic_after_cauchy": str(quadratic),
        "quadratic_global_minimum": str(minimum),
        "conclusion": (
            "With z_v=2c_v/h_v, Var(z)<=1 and the verified "
            "payment E[c]-Var(d)+2Cov(d,z)>=0 imply "
            "Var(A)<=1+E[c]."
        ),
    }
    output = Path(
        "rank3_tree_component_variance_certificate_20260729.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
