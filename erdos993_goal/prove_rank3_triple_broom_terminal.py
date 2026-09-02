#!/usr/bin/env python3
"""Prove the rank-three support-collision triple broom terminal.

The path has L edges from root v to support s.  It carries:

* r leaves at v;
* m leaves at the neighbor of s on the path;
* u leaves at s.

This is the only caterpillar terminal left after the deepest-bundle
theorem and commutation of the two leaf additions.  As in the
double-broom verifier, fixed-rank path formulas give separate degree
at most six in L,r,m,u for L in the stable range.  Seven exact nodes
therefore certify every product-binomial coefficient.
"""

from __future__ import annotations

import json
from itertools import product
from pathlib import Path

import networkx as nx
import sympy as sp

from prove_rank3_deepest_bundle_first_coefficient import direct_total
from prove_rank3_double_broom_terminal import (
    expected_coefficients as double_coefficients,
)


L = sp.symbols("L", integer=True, positive=True)


def triple_broom(
    length: int,
    root_leaves: int,
    collision_leaves: int,
    support_leaves: int,
):
    graph = nx.path_graph(length + 1)
    root = 0
    support = length
    collision = length - 1
    next_vertex = length + 1
    for position, count in (
        (root, root_leaves),
        (collision, collision_leaves),
        (support, support_leaves),
    ):
        for _ in range(count):
            graph.add_edge(position, next_vertex)
            next_vertex += 1
    return graph, root, support


def transform_axis(values, axis):
    size = len(values)
    result = [
        [[0 for _ in range(size)] for _ in range(size)]
        for _ in range(size)
    ]
    for fixed in product(range(size), repeat=2):
        row = []
        for position in range(size):
            index = list(fixed)
            index.insert(axis, position)
            row.append(values[index[0]][index[1]][index[2]])
        coefficients = []
        while row:
            coefficients.append(row[0])
            row = [
                row[index + 1] - row[index]
                for index in range(len(row) - 1)
            ]
        for position, coefficient in enumerate(coefficients):
            index = list(fixed)
            index.insert(axis, position)
            result[index[0]][index[1]][index[2]] = coefficient
    return result


def exact_table(length: int, degree: int = 6):
    values = []
    for root_leaves in range(degree + 1):
        first = []
        for collision_leaves in range(degree + 1):
            second = []
            for support_leaves in range(degree + 1):
                graph, root, support = triple_broom(
                    length,
                    root_leaves,
                    collision_leaves,
                    support_leaves,
                )
                second.append(direct_total(graph, root, support))
            first.append(second)
        values.append(first)
    for axis in range(3):
        values = transform_axis(values, axis)
    return values


def expected_coefficients():
    """Nonzero C(r,i)C(m,j)C(u,k) coefficients for L>=4."""
    double = double_coefficients()
    result = {
        (first, 0, support): sp.sympify(formula)
        for (first, support), formula in double.items()
    }
    result.update(
        {
            (0, 1, 0): 14 * L**2 - 20 * L + 54,
            (0, 1, 1): 60 * L + 22,
            (0, 1, 2): 12 * L + 92,
            (0, 1, 3): 32,
            (0, 2, 0): 72 * L + 26,
            (0, 2, 1): 84,
            (0, 2, 2): 12,
            (0, 3, 0): 12 * L + 112,
            (0, 3, 1): 12,
            (0, 4, 0): 32,
            (1, 1, 0): 172 - 28 * L,
            (1, 1, 1): 58,
            (1, 1, 2): 12,
            (1, 2, 0): 70,
            (1, 3, 0): 12,
            (2, 1, 0): 32 * L + 68,
            (2, 1, 1): 32,
            (2, 2, 0): 32,
            (3, 1, 0): 88,
        }
    )
    return {key: sp.sympify(value) for key, value in result.items()}


def coefficient_identity_certificate():
    expected = expected_coefficients()
    interpolation_lengths = list(range(8, 15))
    tables = {
        length: exact_table(length) for length in interpolation_lengths
    }
    checks = 0
    for first, second, third in product(range(7), repeat=3):
        formula = expected.get(
            (first, second, third), sp.Integer(0)
        )
        for length in interpolation_lengths:
            value = tables[length][first][second][third]
            target = int(formula.subs(L, length))
            assert value == target, (
                length,
                first,
                second,
                third,
                value,
                target,
            )
            checks += 1

    bridge_checks = 0
    for length in range(4, 8):
        table = exact_table(length)
        for first, second, third in product(range(7), repeat=3):
            formula = expected.get(
                (first, second, third), sp.Integer(0)
            )
            assert table[first][second][third] == int(
                formula.subs(L, length)
            ), (length, first, second, third)
            bridge_checks += 1

    short_tables = {}
    for length in (2, 3):
        table = exact_table(length)
        assert all(
            value >= 0
            for plane in table
            for row in plane
            for value in row
        )
        short_tables[str(length)] = {
            f"{first},{second},{third}": value
            for first, plane in enumerate(table)
            for second, row in enumerate(plane)
            for third, value in enumerate(row)
            if value
        }
    return {
        "eventual_degree_bound": 6,
        "interpolation_lengths": interpolation_lengths,
        "interpolation_checks": checks,
        "bridge_lengths": "4..7",
        "bridge_checks": bridge_checks,
        "short_nonnegative_lengths": [2, 3],
        "short_nonzero_coefficient_counts": {
            length: len(table) for length, table in short_tables.items()
        },
    }


def positive_shift(expression, minimum=4):
    x = sp.symbols("x", integer=True, nonnegative=True)
    polynomial = sp.Poly(
        sp.expand(expression.subs(L, x + minimum)), x
    )
    return polynomial, all(
        coefficient >= 0 for coefficient in polynomial.all_coeffs()
    )


def positivity_certificate():
    coefficients = expected_coefficients()
    # All coefficients involving a support leaf are nonnegative.
    support_checks = {}
    for key, expression in coefficients.items():
        if key[2] == 0:
            continue
        polynomial, okay = positive_shift(expression)
        assert okay, (key, expression)
        support_checks[",".join(map(str, key))] = [
            int(value) for value in polynomial.all_coeffs()
        ]

    # Set u=0.  Regard the result as a polynomial in r:
    # F=A0(m)+r A1(m)+C(r,2)A2(m)+C(r,3)A3(m)+C(r,4)A4.
    def coefficient(first, second):
        return coefficients.get((first, second, 0), sp.Integer(0))

    A = {}
    for first in range(5):
        A[first] = [
            coefficient(first, second) for second in range(5)
        ]

    # Delta_r F at r=2 has nonnegative binomial coefficients in m.
    delta_two = [
        sp.expand(A[1][second] + 2 * A[2][second] + A[3][second])
        for second in range(5)
    ]
    delta_checks = {}
    for second, expression in enumerate(delta_two):
        polynomial, okay = positive_shift(expression)
        assert okay and (
            expression != 0 or second >= 4
        ), (second, expression)
        delta_checks[str(second)] = [
            int(value) for value in polynomial.all_coeffs()
        ]

    # The next root difference is
    # A2(m)+rA3(m)+C(r,2)A4, which is strictly positive, so the
    # minimum occurs at r=0,1,2.
    for first in (2, 3, 4):
        for expression in A[first]:
            polynomial, okay = positive_shift(expression)
            assert okay, (first, expression)

    endpoint_checks = {}
    for root_leaves in (0, 1, 2):
        binomial_m = []
        for second in range(5):
            value = (
                A[0][second]
                + root_leaves * A[1][second]
                + (1 if root_leaves == 2 else 0) * A[2][second]
            )
            value = sp.expand(value)
            polynomial, okay = positive_shift(value)
            if second == 0:
                # These are the already-proved double-broom endpoint
                # values.  Their separate derivative certificates are
                # recorded in the double-broom theorem.
                assert value.subs(L, 4) > 0
            else:
                assert okay, (
                    root_leaves,
                    second,
                    value,
                )
            binomial_m.append(str(sp.factor(value)))
        endpoint_checks[str(root_leaves)] = binomial_m

    # The only two coefficient formulas that can be negative.
    assert coefficients[(1, 0, 0)] == -20 * L**2 + 144 * L + 86
    assert coefficients[(1, 1, 0)] == 172 - 28 * L
    return {
        "support_leaf_coefficients": support_checks,
        "root_forward_difference_at_r=2_by_m_order": delta_checks,
        "root_endpoint_m_coefficients": endpoint_checks,
        "only_potentially_negative_coefficients": {
            "1,0,0": str(coefficients[(1, 0, 0)]),
            "1,1,0": str(coefficients[(1, 1, 0)]),
        },
    }


def main():
    identity = coefficient_identity_certificate()
    positivity = positivity_certificate()
    report = {
        "status": "PASS_RANK3_TRIPLE_BROOM_TERMINAL",
        "quantity": (
            "actual rank-three support-leaf increment on the unique "
            "support-collision caterpillar terminal"
        ),
        "mixed_binomial_coefficients_for_L_at_least_4": {
            ",".join(map(str, key)): str(sp.factor(value))
            for key, value in expected_coefficients().items()
        },
        "coefficient_identity_certificate": identity,
        "positivity_certificate": positivity,
        "conclusion": (
            "The triple-broom terminal is nonnegative for every "
            "L>=2 and all three leaf-bundle sizes; L=1 is the "
            "double-broom terminal."
        ),
    }
    Path(
        "rank3_triple_broom_terminal_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
