#!/usr/bin/env python3
"""Verify the sharp one-unit rank-three forest payment floor."""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx
import sympy as sp


def nonnegative_coefficients(expression, *variables) -> bool:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    return all(coefficient >= 0 for coefficient in polynomial.coeffs())


def direct_tree_floor(tree: nx.Graph) -> tuple[int, int]:
    order = len(tree)
    degrees = dict(tree.degree())
    mass = h2 = h3 = c0 = c1 = 0
    for vertex in tree:
        h = order - 1 - degrees[vertex]
        c = sum(
            degrees[neighbor] - 1 for neighbor in tree[vertex]
        )
        mass += h
        h2 += h * h
        h3 += h * h * h
        c0 += c
        c1 += h * c
    if mass == 0:
        return 0, 0
    floor_numerator = (
        h2 * h2
        + 4 * h2 * c0
        - mass * h3
        - 3 * mass * c1
        - mass * mass
    )
    return floor_numerator, mass


def main() -> None:
    I, N, T, X2, X3, Q = sp.symbols(
        "I N T X2 X3 Q", nonnegative=True
    )
    M = (
        I**2
        + 2 * I * N
        + 4 * I * T
        + 3 * I
        + N**2
        + 4 * N * T
        + N
        + 4 * T**2
        + 4 * T
    )
    B = (
        10 * I**2
        + 4 * I * N
        + 24 * I * T
        + 14 * I
        - 6 * N**2
        - 8 * N * T
        + 4 * N
        + 8 * T**2
        + 8 * T
    )

    n, components, s2, s3, edge_product = sp.symbols(
        "n components s2 s3 edge_product"
    )
    s1 = 2 * (n - components)
    mass = sp.expand(n * (n - 1) - s1)
    sum_c = sp.expand(n * (components - 1) + s2 - s1)
    sum_dc = sp.expand(
        (components - 1) * s1 + 2 * edge_product - s2
    )
    mean_d_numerator = sp.expand((n - 1) * s1 - s2)
    payment_numerator = sp.expand(
        mass
        * (
            (n - 1) * sum_c
            - sum_dc
            - ((n - 1) * s2 - s3)
            + 4 * sum_dc
        )
        + mean_d_numerator**2
        - 4 * mean_d_numerator * sum_c
    )
    nontrivial_components = T + 1
    substitutions = {
        n: N + 2 * nontrivial_components + I,
        components: nontrivial_components + I,
        s2: X2 + 3 * N + 2 * nontrivial_components,
        s3: (
            X3
            + 3 * X2
            + 4 * N
            + 2 * nontrivial_components
        ),
        edge_product: Q + X2 + 2 * N + nontrivial_components,
    }
    transformed = sp.expand(payment_numerator.subs(substitutions))
    assert sp.expand(mass.subs(substitutions) - M) == 0

    floor_polynomial = sp.expand(transformed - M**2)
    constant = sp.factor(
        floor_polynomial.subs({X2: 0, X3: 0, Q: 0})
    )
    expected = (
        constant + M * X3 + 6 * M * Q + B * X2 + 5 * X2**2
    )
    assert sp.expand(floor_polynomial - expected) == 0

    C0 = sp.factor(constant.subs(I, 0))
    B0 = sp.factor(B.subs(I, 0))
    M0 = sp.factor(M.subs(I, 0))
    Delta0 = sp.factor(4 * (M0 + 5 * N) * C0 - N * B0**2)

    U = sp.symbols("U", nonnegative=True)
    assert nonnegative_coefficients(C0.subs(T, U + 1), N, U)
    assert nonnegative_coefficients(
        (Delta0 / 4).subs(T, U + 1), N, U
    )

    isolate_increment = sp.expand(constant - C0)
    isolate_polynomial = sp.Poly(isolate_increment, I)
    for power in range(1, isolate_polynomial.degree() + 1):
        coefficient = isolate_polynomial.coeff_monomial(I**power)
        assert nonnegative_coefficients(
            coefficient.subs(T, U + 1), N, U
        )
    assert sp.factor(B - B0) == (
        2 * I * (5 * I + 2 * N + 12 * T + 7)
    )

    connected_constant = sp.factor(constant.subs(T, 0))
    connected_delta = sp.factor(
        (
            4 * (M + 5 * N) * constant - N * B**2
        ).subs(T, 0)
    )
    assert sp.expand(
        connected_constant.subs(I, 0)
        - N**2 * (N**2 - 5 * N - 1)
    ) == 0
    assert sp.factor(connected_delta.subs(I, 0)) == (
        4 * N**3 * (N - 10) * (N + 1) ** 2
    )

    J = sp.symbols("J", nonnegative=True)
    assert nonnegative_coefficients(
        connected_constant.subs(I, J + 2), N, J
    )
    assert nonnegative_coefficients(
        (connected_delta / 4).subs(I, J + 2), N, J
    )
    one_isolate_constant = sp.factor(connected_constant.subs(I, 1))
    one_isolate_delta = sp.factor(connected_delta.subs(I, 1))
    assert sp.expand(
        one_isolate_constant
        - (2 * N**4 - N**3 - 6 * N**2 + 14 * N + 4)
    ) == 0
    assert sp.expand(
        one_isolate_delta
        - 8
        * (N - 1)
        * (
            N**5
            + 4 * N**4
            + 13 * N**3
            + 22 * N**2
            + 20 * N
            - 8
        )
    ) == 0

    finite_checks = failures = 0
    finite_minimum = None
    for order in range(3, 12):
        for tree in nx.nonisomorphic_trees(order):
            numerator, direct_mass = direct_tree_floor(tree)
            if direct_mass == 0:
                continue
            finite_checks += 1
            failures += numerator < 0
            if (
                finite_minimum is None
                or numerator * finite_minimum[1]
                < finite_minimum[0] * direct_mass**2
            ):
                finite_minimum = (
                    numerator,
                    direct_mass**2,
                    order,
                    nx.to_graph6_bytes(
                        tree, header=False
                    ).decode("ascii").strip(),
                )
    assert failures == 0
    assert finite_minimum is not None

    report = {
        "status": "PASS_RANK3_FOREST_ONE_UNIT_PAYMENT_FLOOR",
        "scope": (
            "Symbolic proof outside a finite connected base, plus "
            "exact enumeration of every exceptional connected tree "
            "through order 11."
        ),
        "floor_polynomial_decomposition": (
            "C + M*X3 + 6*M*Q + B*X2 + 5*X2^2"
        ),
        "connected_no_isolate_constant": str(
            connected_constant.subs(I, 0)
        ),
        "connected_no_isolate_discriminant": str(
            connected_delta.subs(I, 0)
        ),
        "finite_connected_tree_checks": finite_checks,
        "finite_failures": failures,
        "finite_minimum": {
            "exact": f"{finite_minimum[0]}/{finite_minimum[1]}",
            "decimal": finite_minimum[0] / finite_minimum[1],
            "tree_order": finite_minimum[2],
            "graph6": finite_minimum[3],
        },
        "conclusion": (
            "For every positive-mass rank-three forest, "
            "E[c]-Var(h)-2*Cov(h,2c/h) >= 1; hence Var(A)<=E[c]."
        ),
    }
    output = Path(
        "rank3_forest_payment_floor_certificate_20260729.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
