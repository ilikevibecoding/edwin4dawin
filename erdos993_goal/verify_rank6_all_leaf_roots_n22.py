#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at every leaf of order 22.

Most degree-excess partitions are handled by the normalized moment
certificate with a support-aware degree-capacity edge bound.  The 139
partitions left inconclusive are realized exactly through every
compatible weighted positive-excess core tree.
"""

from __future__ import annotations

from collections import Counter
from fractions import Fraction
from math import comb

import networkx as nx
import sympy as sp

from explore_rank6_root_ratio_moment_certificate import (
    normalized_relaxation,
)


ORDER = 22
TOTAL_EXCESS = ORDER - 2
EXPECTED_CORE_SHAPES = {
    6: 6,
    7: 11,
    8: 23,
    9: 47,
    10: 106,
    11: 235,
    12: 551,
    13: 1301,
    14: 3159,
    15: 7741,
}


def integer_partitions(total, maximum=None, prefix=()):
    if total == 0:
        yield prefix
        return
    if maximum is None:
        maximum = total
    for first in range(min(total, maximum), 0, -1):
        yield from integer_partitions(
            total - first,
            first,
            prefix + (first,),
        )


def support_capacity_product_upper(weights):
    """Parent-slot edge upper retaining the rooted leaf's used slot."""

    if len(weights) <= 1:
        return 0
    support = 0
    if weights[support] == max(weights):
        root = support
    else:
        root = max(
            range(1, len(weights)),
            key=lambda index: weights[index],
        )

    children = sorted(
        (
            weight
            for index, weight in enumerate(weights)
            if index != root
        ),
        reverse=True,
    )
    slots = []
    for index, weight in enumerate(weights):
        # The distinguished rooted leaf already consumes one incident
        # edge at the support.
        degree_cap = weight if index == support else weight + 1
        child_slots = (
            degree_cap
            if index == root
            else degree_cap - 1
        )
        slots.extend([weight] * child_slots)
    slots.sort(reverse=True)
    assert len(slots) >= len(children)
    return sum(
        child * parent
        for child, parent in zip(children, slots)
    )


def evaluate_polynomial(polynomial, variables, values):
    result = Fraction(0)
    for monomial, coefficient in sp.Poly(
        polynomial, *variables
    ).terms():
        term = Fraction(int(coefficient))
        for power, value in zip(monomial, values):
            term *= Fraction(value) ** power
        result += term
    return result


def scaled_margin_polynomials():
    moments, variables = normalized_relaxation()
    (
        u,
        second,
        third,
        root,
        edge_correlation,
        neighbor_first,
        neighbor_second,
        root_edge_correlation,
        connected_four,
        connected_four_loss,
    ) = variables
    s2, s3, edge, loss, surviving, support = sp.symbols(
        "s2 s3 edge loss surviving support"
    )
    n = sp.Integer(ORDER)
    common = {
        u: sp.Rational(1, ORDER),
        second: s2 / n**2,
        third: s3 / n**3,
        root: 0,
        edge_correlation: edge / n**2,
        root_edge_correlation: 0,
        connected_four: (loss + surviving) / n**4,
        connected_four_loss: loss / n**4,
    }
    one = sp.Poly(
        sp.expand(
            36
            * moments.subs(
                common
                | {
                    neighbor_first: sp.Rational(1, ORDER),
                    neighbor_second: sp.Rational(1, ORDER**2),
                }
            )
            * n**9
        ),
        s2,
        s3,
        edge,
        loss,
        surviving,
    ).as_expr()
    branch = sp.Poly(
        sp.expand(
            36
            * moments.subs(
                common
                | {
                    neighbor_first: support / n,
                    neighbor_second: support**2 / n**2,
                }
            )
            * n**9
        ),
        s2,
        s3,
        edge,
        loss,
        surviving,
        support,
    ).as_expr()
    assert len(
        sp.Poly(one, s2, s3, edge, loss, surviving).terms()
    ) == 18
    assert len(
        sp.Poly(
            branch,
            s2,
            s3,
            edge,
            loss,
            surviving,
            support,
        ).terms()
    ) == 30
    return (
        one,
        branch,
        (s2, s3, edge, loss, surviving),
        (s2, s3, edge, loss, surviving, support),
    )


def certify_bound_directions(polynomial, variables, values):
    edge = variables[2]
    loss = variables[3]
    surviving = variables[4]
    edge_second = sp.factor(sp.diff(polynomial, edge, 2))
    assert edge_second == 648 > 0
    assert evaluate_polynomial(
        sp.diff(polynomial, edge), variables, values
    ) < 0
    assert evaluate_polynomial(
        sp.diff(polynomial, loss), variables, values
    ) < 0
    assert evaluate_polynomial(
        sp.diff(polynomial, surviving), variables, values
    ) > 0


def partition_values(support, far_weights):
    weights = (support,) + far_weights
    second = sum(weight**2 for weight in weights)
    third = sum(weight**3 for weight in weights)
    edge = support_capacity_product_upper(weights)
    far_total = TOTAL_EXCESS - support
    far_second = sum(weight**2 for weight in far_weights)
    if support == 1:
        loss = Fraction(far_second, 2) + far_total
        stars = sum(
            comb(weight + 1, 4)
            for weight in far_weights
        )
    else:
        loss = (
            Fraction(comb(support, 3))
            + Fraction(far_second, 2)
            + (support - 1) * far_total
        )
        stars = comb(support, 4) + sum(
            comb(weight + 1, 4)
            for weight in far_weights
        )
    surviving = max(ORDER - 5, stars)
    return second, third, edge, loss, surviving


def coarse_partition_certificate(
    one_polynomial,
    branch_polynomial,
    one_variables,
    branch_variables,
):
    one_minimum = None
    one_witness = None
    one_count = 0
    for far_weights in integer_partitions(TOTAL_EXCESS - 1):
        values = partition_values(1, far_weights)
        certify_bound_directions(
            one_polynomial, one_variables, values
        )
        margin = evaluate_polynomial(
            one_polynomial, one_variables, values
        ) / 36
        one_count += 1
        if one_minimum is None or margin < one_minimum:
            one_minimum = margin
            one_witness = (far_weights,) + values

    assert one_count == 490
    assert one_minimum == 21310704
    assert one_witness == (
        (1,) * 19,
        20,
        20,
        19,
        Fraction(57, 2),
        17,
    )

    positive_count = 0
    positive_minimum = None
    positive_witness = None
    inconclusive = []
    total_count = 0
    for support in range(2, TOTAL_EXCESS + 1):
        for far_weights in integer_partitions(
            TOTAL_EXCESS - support
        ):
            base_values = partition_values(support, far_weights)
            values = base_values + (support,)
            certify_bound_directions(
                branch_polynomial, branch_variables, values
            )
            margin = evaluate_polynomial(
                branch_polynomial,
                branch_variables,
                values,
            ) / 36
            total_count += 1
            if margin > 0:
                positive_count += 1
                if (
                    positive_minimum is None
                    or margin < positive_minimum
                ):
                    positive_minimum = margin
                    positive_witness = (
                        support,
                        far_weights,
                    ) + base_values
            else:
                inconclusive.append((support, far_weights))

    assert total_count == 1597
    assert positive_count == 1458
    assert positive_minimum == 45726
    assert positive_witness == (
        9,
        (3, 3, 2, 2, 1),
        108,
        800,
        99,
        Fraction(371, 2),
        128,
    )
    assert len(inconclusive) == 139
    assert Counter(
        support for support, _ in inconclusive
    ) == {
        5: 16,
        6: 35,
        7: 37,
        8: 29,
        9: 16,
        10: 6,
    }
    return (
        (one_count, one_minimum, one_witness),
        (
            total_count,
            positive_count,
            positive_minimum,
            positive_witness,
        ),
        inconclusive,
    )


def exact_coefficients(order, weights, edges, adjacency):
    edge_correlation = sum(
        weights[first] * weights[second]
        for first, second in edges
    )
    moment_two = sum(weight**2 for weight in weights)
    moment_three = sum(weight**3 for weight in weights)
    wedges = sum(comb(weight + 1, 2) for weight in weights)
    triples = (
        sum(comb(weight + 1, 3) for weight in weights)
        + edge_correlation
    )
    disconnected_twice = (
        (order - 3) * moment_two
        + (order - 2) ** 2
        - moment_three
        - 4 * edge_correlation
    )
    assert disconnected_twice % 2 == 0
    disconnected = disconnected_twice // 2

    stars = sum(comb(weight + 1, 4) for weight in weights)
    brooms = sum(
        comb(weights[first], 2) * weights[second]
        + comb(weights[second], 2) * weights[first]
        for first, second in edges
    )
    paths = 0
    for vertex, neighbors in enumerate(adjacency):
        neighbor_weights = [
            weights[neighbor] for neighbor in neighbors
        ]
        paths += (
            sum(neighbor_weights) ** 2
            - sum(weight**2 for weight in neighbor_weights)
        ) // 2
    connected_four = stars + brooms + paths

    i4 = (
        comb(order, 4)
        - (order - 1) * comb(order - 2, 2)
        + wedges * (order - 4)
        + comb(order - 1, 2)
        - triples
    )
    i5 = (
        comb(order, 5)
        - (order - 1) * comb(order - 2, 3)
        + wedges * comb(order - 3, 2)
        + (comb(order - 1, 2) - wedges) * (order - 4)
        - triples * (order - 4)
        - disconnected
        + connected_four
    )
    return i4, i5


def exact_strong(adjacency, edges, weights, support_vertex):
    i4, i5 = exact_coefficients(
        ORDER, weights, edges, adjacency
    )
    deleted_weights = list(weights)
    deleted_weights[support_vertex] -= 1
    h4, h5 = exact_coefficients(
        ORDER - 1,
        deleted_weights,
        edges,
        adjacency,
    )
    value = i4 * (2 * i5 + i4) - 24 * (
        i5 * h4 - i4 * h5
    )
    return value, (i4, i5), (h4, h5)


def compatible_assignments(degrees, support_vertex, far_weights):
    vertices = [
        vertex
        for vertex in range(len(degrees))
        if vertex != support_vertex
    ]
    vertices.sort(key=lambda vertex: degrees[vertex], reverse=True)
    counts = Counter(far_weights)
    choices = sorted(counts, reverse=True)
    assignment = [0] * len(degrees)

    def generate(position):
        if position == len(vertices):
            yield tuple(assignment)
            return
        vertex = vertices[position]
        minimum_weight = degrees[vertex] - 1
        for weight in choices:
            if counts[weight] and weight >= minimum_weight:
                counts[weight] -= 1
                assignment[vertex] = weight
                yield from generate(position + 1)
                counts[weight] += 1

    yield from generate(0)


def exact_inconclusive_certificate(inconclusive):
    core_orders = sorted(
        {1 + len(far_weights) for _, far_weights in inconclusive}
    )
    assert core_orders == list(range(6, 16))

    core_trees = {}
    for order in core_orders:
        rows = []
        for tree in nx.nonisomorphic_trees(order):
            adjacency = tuple(
                tuple(tree.neighbors(vertex))
                for vertex in range(order)
            )
            degrees = tuple(
                len(neighbors) for neighbors in adjacency
            )
            edges = tuple(tree.edges())
            rows.append((adjacency, degrees, edges))
        assert len(rows) == EXPECTED_CORE_SHAPES[order]
        core_trees[order] = rows

    count = 0
    minimum = None
    witness = None
    for support_weight, far_weights in inconclusive:
        core_order = 1 + len(far_weights)
        for adjacency, degrees, edges in core_trees[core_order]:
            for support_vertex in range(core_order):
                if degrees[support_vertex] > support_weight:
                    continue
                for raw_weights in compatible_assignments(
                    degrees,
                    support_vertex,
                    far_weights,
                ):
                    weights = list(raw_weights)
                    weights[support_vertex] = support_weight
                    value, whole, deleted = exact_strong(
                        adjacency,
                        edges,
                        weights,
                        support_vertex,
                    )
                    count += 1
                    if minimum is None or value < minimum:
                        minimum = value
                        witness = (
                            support_weight,
                            far_weights,
                            degrees,
                            support_vertex,
                            tuple(weights),
                            whole,
                            deleted,
                        )

    assert count == 1698339
    assert minimum == 21307524
    assert witness == (
        6,
        (1,) * 14,
        (2, 2, 2, 2, 6, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1),
        4,
        (1, 1, 1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
        (4086, 9788),
        (3190, 6873),
    )
    return count, minimum, witness


def main():
    (
        one_polynomial,
        branch_polynomial,
        one_variables,
        branch_variables,
    ) = scaled_margin_polynomials()
    coarse = coarse_partition_certificate(
        one_polynomial,
        branch_polynomial,
        one_variables,
        branch_variables,
    )
    exact = exact_inconclusive_certificate(coarse[2])
    print(
        "rank-6 strong inequality at every order-22 "
        "leaf root: CERTIFIED"
    )
    print("coarse partition certificate:", coarse[:2])
    print("inconclusive exact states:", exact[:2])


if __name__ == "__main__":
    main()
