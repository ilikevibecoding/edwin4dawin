#!/usr/bin/env python3
"""Symbolically verify the large-order rank-three forest-mixture lemma.

For a forest G of fixed order n, let x(G)=(S,H2,H3,C0,C1) be its
rank-three residual moment vector, and let

    Q(x) = H2^2 + 4 H2 C0 - S H3 - 3 S C1 - S^2.

The C1 formula has a quadratic component-count term, so a mixture
requires an explicit component-count variance correction.  This
script includes that correction and verifies that Q is nonnegative on
every such mixture when n >= 17.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


def shifted_coefficients_nonnegative(
    expression: sp.Expr, variable: sp.Symbol
) -> bool:
    polynomial = sp.Poly(sp.expand(expression), variable)
    return all(coefficient >= 0 for coefficient in polynomial.all_coeffs())


def main() -> None:
    n, c, c2, m, s2, s3, edge_product = sp.symbols(
        "n c c2 m s2 s3 edge_product", nonnegative=True
    )

    # The degree sum of an n-vertex forest with c components is
    # s1=2(n-c).  The five rank-three residual moments follow by
    # summing h_v=n-1-d_v and c_v over the vertices.
    s1 = 2 * (n - c)
    S = sp.expand(n * (n - 1) - s1)
    H2 = sp.expand(n * (n - 1) ** 2 - 2 * (n - 1) * s1 + s2)
    H3 = sp.expand(
        n * (n - 1) ** 3
        - 3 * (n - 1) ** 2 * s1
        + 3 * (n - 1) * s2
        - s3
    )
    C0 = sp.expand(n * (c - 1) + s2 - s1)
    sum_degree_times_components = sp.expand(
        (c - 1) * s1 + 2 * edge_product - s2
    )
    C1 = sp.expand(
        (n - 1) * C0 - sum_degree_times_components
    )
    Q = sp.expand(H2**2 + 4 * H2 * C0 - S * H3 - 3 * S * C1 - S**2)

    expected_Q = (
        -12 * c**3
        + 8 * c**2 * n**2
        + 32 * c**2 * n
        - 8 * c**2
        + c * n**4
        - 12 * c * n**3
        - 43 * c * n**2
        + 26 * c * n
        + (12 * c + 6 * n**2 - 18 * n) * edge_product
        + 5 * s2**2
        + (16 * c * n - 10 * c - 15 * n**2 + 9 * n) * s2
        + (2 * c + n**2 - 3 * n) * s3
        + 28 * n**3
        - 20 * n**2
    )
    assert sp.expand(Q - expected_Q) == 0
    assert sp.expand(S - (2 * c + n**2 - 3 * n)) == 0
    assert sp.expand(Q.coeff(edge_product) - 6 * S) == 0
    assert sp.expand(Q.coeff(s3) - S) == 0

    # For a mixture, c, s2, s3, and edge_product above denote means.
    # The only non-affine coordinate is C1: averaging its c^2 term
    # adds 2*(E[c^2]-E[c]^2).  Therefore the actual quadratic
    # payment is Q-6*S*Var(c).
    component_variance = c2 - c**2
    mixture_Q = sp.expand(Q - 6 * S * component_variance)
    assert sp.expand(
        mixture_Q - Q + 6 * S * (c2 - c**2)
    ) == 0

    # Write m=n-c for the mean number of edges in the mixture.
    # For every forest, edge_product >= s2-m.  Averaging and Cauchy
    # also give s3 >= s2^2/(2m) when m>0.  Since both coefficients
    # above are nonnegative, these substitutions give a lower bound.
    # Since each edge count lies in [0,n-1],
    #
    #   Var(c)=Var(m_G) <= m*(n-1-m).
    #
    # The negative variance correction is thus bounded explicitly.
    Q_m = sp.expand(Q.subs(c, n - m))
    pre_variance_lower_bound = sp.factor(
        Q_m.subs(edge_product, s2 - m).subs(
            s3, s2**2 / (2 * m)
        )
    )
    mixture_mass = sp.expand(S.subs(c, n - m))
    lower_bound = sp.factor(
        pre_variance_lower_bound
        - 6 * mixture_mass * m * (n - 1 - m)
    )
    lower_numerator = sp.expand(2 * m * lower_bound)
    A = sp.expand(lower_numerator.coeff(s2, 2))
    B = sp.expand(lower_numerator.coeff(s2, 1))
    C = sp.expand(lower_numerator.coeff(s2, 0))
    assert sp.expand(lower_numerator - (A * s2**2 + B * s2 + C)) == 0
    assert sp.factor(A) == 8 * m + n**2 - n
    assert sp.factor(B) == (
        -2 * m * (16 * m * n + 2 * m - 7 * n**2 + 7 * n)
    )
    assert sp.factor(C) == (
        2
        * m
        * (
            14 * m**2 * n**2
            + 2 * m**2 * n
            - 8 * m**2
            - m * n**4
            - 10 * m * n**3
            + 21 * m * n**2
            - 10 * m * n
            + n**5
            - 4 * n**4
            + 5 * n**3
            - 2 * n**2
        )
    )

    discriminant_payment = sp.factor(4 * A * C - B**2)
    E = sp.factor(discriminant_payment / (4 * m))
    expected_E = (
        -32 * m**3 * n**2
        - 32 * m**3 * n
        - 132 * m**3
        + 12 * m**2 * n**4
        + 40 * m**2 * n**3
        + 120 * m**2 * n**2
        - 172 * m**2 * n
        - 2 * m * n**6
        - 2 * m * n**5
        - 51 * m * n**4
        + 116 * m * n**3
        - 61 * m * n**2
        + 2 * n**7
        - 10 * n**6
        + 18 * n**5
        - 14 * n**4
        + 4 * n**3
    )
    assert sp.expand(E - expected_E) == 0

    # A convex mixture of forests has 0 <= m <= n-1.  Put
    # p=n-1-m.  At p=0 the expression is the tree boundary.
    p = sp.symbols("p", nonnegative=True)
    tree_boundary = sp.factor(E.subs(m, n - 1))
    assert tree_boundary == (n - 2) ** 2 * (n - 1) ** 3 * (2 * n - 33)
    E_p = sp.expand(E.subs(m, n - 1 - p))
    R = sp.factor((E_p - tree_boundary) / p)
    expected_R = (
        2 * n**6
        - 22 * n**5
        + 91 * n**4
        - 372 * n**3
        + 945 * n**2
        - 1040 * n
        + 396
        + p * (12 * n**4 - 56 * n**3 + 120 * n**2 - 472 * n + 396)
        + p**2 * (32 * n**2 + 32 * n + 132)
    )
    assert sp.expand(R - expected_R) == 0

    # Every coefficient of R becomes coefficientwise nonnegative
    # after the shift n=N+17.
    N = sp.symbols("N", nonnegative=True)
    shifted_R = sp.Poly(sp.expand(R.subs(n, N + 17)), N, p)
    assert all(coefficient >= 0 for coefficient in shifted_R.coeffs())

    # Therefore E>=0.  Since A>0 for n>=17 and m>0,
    # 4AC-B^2=4mE>=0, so the quadratic lower numerator is
    # nonnegative for every real s2.
    assert shifted_coefficients_nonnegative(
        tree_boundary.subs(n, N + 17), N
    )

    # The m=0 mixture consists only of the edgeless forest.
    edgeless_Q = sp.factor(Q.subs({
        c: n,
        s2: 0,
        s3: 0,
        edge_product: 0,
    }))
    assert edgeless_Q == n**2 * (n - 2) * (n - 1) ** 2

    report = {
        "status": "PASS_SAME_ORDER_RANK3_MIXTURE_N_GE_17",
        "scope": (
            "Every convex mixture of rank-three moment vectors of "
            "forests having one common order n>=17."
        ),
        "raw_Q": str(sp.collect(Q, [edge_product, s2, s3])),
        "mixture_component_variance_correction": "-6*S*Var(c)",
        "component_variance_bound": "Var(c) <= m*(n-1-m)",
        "lower_numerator": str(sp.collect(lower_numerator, s2)),
        "quadratic_A": str(sp.factor(A)),
        "quadratic_B": str(sp.factor(B)),
        "quadratic_C": str(sp.factor(C)),
        "four_A_C_minus_B_squared": str(discriminant_payment),
        "tree_boundary_E": str(tree_boundary),
        "shifted_R_has_nonnegative_coefficients": True,
        "m_zero_Q": str(edgeless_Q),
        "conclusion": (
            "The rank-free payment Q is nonnegative on the "
            "same-order forest-mixture cone for n>=17."
        ),
    }
    output = Path(
        "same_order_rank3_mixture_certificate_20260729.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
