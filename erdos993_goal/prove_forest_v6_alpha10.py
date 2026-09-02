#!/usr/bin/env python3
"""Certify V6>=0 for forests with independence number at least ten.

The all-order part has three ingredients.

1.  The separately certified sharp tree bound

        i5(T)/i4(T) >= (n-7)(n-8)/(5(n-3)).

    Adding leaf-to-leaf bridges transfers this bound from trees to
    arbitrary forests.  The lost independent sets are exactly
    ``x^2 I(R)`` for a residual forest R of order at least n-4, and the
    elementary sharp forest i3/i2 path bound pays this correction.

2.  For a uniform independent four-set S, use the first two moments of
    the number of vertices extending S to bound i6 in terms of i4,i5.

3.  The resulting inequality is positive for n>=21.  Every distinct
    forest independence polynomial with 10<=n<=20 is checked exactly.
"""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx
import sympy as sp
from flint import fmpz_poly as Poly

from scan_forest_iso_reserve_floor import tree_polynomial


REPORT = Path(__file__).with_name("forest_v6_alpha10_exact_20260813.json")


def v6(polynomial: tuple[int, ...]) -> int:
    return (
        4 * polynomial[4] * polynomial[5]
        + 39 * polynomial[4] * polynomial[6]
        - 25 * polynomial[5] ** 2
    )


def symbolic_certificate() -> dict[str, str]:
    n, m, mu, p0, variance = sp.symbols(
        "n m mu p0 variance", positive=True
    )

    # Elementary sharp forest rank-(2,3) path ratio.  If a q-vertex
    # forest has e edges and w=sum_v C(d(v),2), then
    #
    #   i2=C(q,2)-e,  i3=C(q,3)-e(q-2)+w.
    #
    # In the dense range e>=q/2 use w>=2e-q and write
    # t=(q-1)-e.  In the sparse range e<=q/2 use w>=0; the gap is
    # decreasing in e, so its endpoint e=q/2 is the worst case.
    q, edges, wedges, components_minus_one = sp.symbols(
        "q edges wedges components_minus_one", nonnegative=True
    )
    i2 = sp.binomial(q, 2) - edges
    i3 = sp.binomial(q, 3) - edges * (q - 2) + wedges
    rank32_gap = sp.factor(
        sp.expand_func(
            3 * (q - 1) * i3 - (q - 3) * (q - 4) * i2
        )
    )
    dense_gap = sp.factor(
        rank32_gap.subs(
            {
                edges: q - 1 - components_minus_one,
                wedges: 2 * (q - 1 - components_minus_one) - q,
            }
        )
    )
    assert dense_gap == 2 * q * components_minus_one * (q - 4)
    sparse_gap = sp.factor(
        rank32_gap.subs({edges: q / 2, wedges: 0})
    )
    assert sparse_gap == q * (q - 4) * (q - 2)
    assert sp.simplify(
        sp.diff(rank32_gap, edges) + 2 * (q**2 - q - 3)
    ) == 0

    forest_rank32 = (q - 3) * (q - 4) / (3 * (q - 1))
    rank32_increment = sp.factor(
        forest_rank32.subs(q, q + 1) - forest_rank32
    )
    assert rank32_increment == (q - 3) * (q + 2) / (
        3 * q * (q - 1)
    )

    # Bridge transfer.  Join two components at vertices of degree at
    # most one.  If F' is the joined forest, then
    #
    #   I(F)=I(F')+x^2 I(R),  |R|>=n-4.
    #
    # Thus the correction ratio is at least the rank-(2,3) path ratio
    # at order n-4.  It strictly exceeds the target rank-(4,5) ratio.
    path_ratio = (n - 7) * (n - 8) / (5 * (n - 3))
    residual_ratio = (n - 7) * (n - 8) / (3 * (n - 5))
    residual_gap = (
        2 * n * (n - 8) * (n - 7)
    ) / (15 * (n - 5) * (n - 3))
    assert sp.factor(residual_ratio - path_ratio - residual_gap) == 0

    expected_pairs = (mu**2 + variance - 3 * mu + 2) / 2 - p0
    p0_ceiling = 1 - mu / m
    pair_lower = sp.factor(expected_pairs.subs({variance: 0, p0: p0_ceiling}))
    assert pair_lower == mu * (m * mu - 3 * m + 2) / (2 * m)

    v_lower = sp.factor(
        sp.Rational(4, 5) * mu
        + sp.Rational(39, 15) * pair_lower
        - mu**2
    )
    assert v_lower == mu * (3 * m * mu - 31 * m + 26) / (10 * m)

    path_mu = 5 * path_ratio
    final_numerator = sp.factor(
        (3 * path_mu - 31 + 26 / (n - 4))
        * (n - 4)
        * (n - 3)
    )
    assert final_numerator == 3 * n**3 - 88 * n**2 + 591 * n - 1122
    y = sp.symbols("y", nonnegative=True)
    shifted = sp.expand(final_numerator.subs(n, y + 21))
    assert shifted == 3 * y**3 + 101 * y**2 + 864 * y + 264
    return {
        "forest_rank32_dense_gap": str(dense_gap),
        "forest_rank32_sparse_endpoint_gap": str(sparse_gap),
        "forest_rank32_order_increment": str(rank32_increment),
        "bridge_residual_ratio_minus_target": str(
            sp.factor(residual_ratio - path_ratio)
        ),
        "moment_lower_bound": str(v_lower),
        "large_order_numerator_shifted": str(shifted),
    }


def finite_boundary() -> dict:
    tree_sets: list[set[tuple[int, ...]]] = [set() for _ in range(20)]
    tree_sets[1].add((1, 1))
    expected_unlabeled_tree_counts = {
        1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 6, 7: 11, 8: 23,
        9: 47, 10: 106, 11: 235, 12: 551, 13: 1301, 14: 3159,
        15: 7741, 16: 19320, 17: 48629, 18: 123867,
        19: 317955, 20: 823065,
    }
    tree_census = {1: {"unlabeled": 1, "distinct_polynomials": 1}}
    for order in range(2, 19):
        count = 0
        states = set()
        for tree in nx.nonisomorphic_trees(order):
            count += 1
            states.add(tree_polynomial(tree))
        assert count == expected_unlabeled_tree_counts[order]
        tree_sets[order] = states
        tree_census[order] = {
            "unlabeled": count,
            "distinct_polynomials": len(states),
        }
        print("tree set", order, len(tree_sets[order]), flush=True)

    forests: list[set[tuple[int, ...]]] = [set() for _ in range(20)]
    forests[0].add((1,))
    expected_forest_counts = (
        1, 2, 3, 6, 10, 20, 36, 73, 142, 294, 618, 1348,
        2974, 6777, 15739, 37524, 90965, 224562,
    )
    for order in range(1, 19):
        current = set()
        for component_order in range(1, order + 1):
            for left in forests[order - component_order]:
                left_poly = Poly(list(left))
                for right in tree_sets[component_order]:
                    current.add(tuple(int(value) for value in left_poly * Poly(list(right))))
        forests[order] = current
        assert len(current) == expected_forest_counts[order - 1]
        print("forest set", order, len(current), flush=True)

    counts = {}
    minima = {}
    minimum_record = None
    global_minimum = None
    alpha9_negative = []
    for order in range(10, 19):
        eligible = [
            polynomial
            for polynomial in forests[order]
            if len(polynomial) - 1 >= 10
        ]
        values = [v6(polynomial) for polynomial in eligible]
        assert values and min(values) >= 0
        counts[order] = len(eligible)
        minima[order] = min(values)
        local = min((v6(polynomial), polynomial) for polynomial in eligible)
        if global_minimum is None or local[0] < global_minimum:
            global_minimum = local[0]
            minimum_record = [order, list(local[1])]
        if order <= 18:
            for polynomial in forests[order]:
                if len(polynomial) - 1 == 9 and v6(polynomial) < 0:
                    alpha9_negative.append([order, list(polynomial), v6(polynomial)])

    # Order 19: enumerate every connected tree once, then every disconnected
    # forest by selecting a smallest component, whose order is at most nine.
    tree19 = set()
    tree19_count = 0
    for tree in nx.nonisomorphic_trees(19):
        tree19_count += 1
        polynomial = tree_polynomial(tree)
        tree19.add(polynomial)
        if len(polynomial) - 1 >= 10:
            value = v6(polynomial)
            assert value >= 0
    assert tree19_count == 317_955
    assert len(tree19) == 250_737
    tree_census[19] = {
        "unlabeled": tree19_count,
        "distinct_polynomials": len(tree19),
    }
    forest19 = set(tree19)
    for component_order in range(1, 10):
        for left in forests[19 - component_order]:
            left_poly = Poly(list(left))
            for right in tree_sets[component_order]:
                forest19.add(tuple(int(value) for value in left_poly * Poly(list(right))))
    assert len(forest19) == 561_475
    forests.append(forest19)
    eligible19 = [polynomial for polynomial in forest19 if len(polynomial) - 1 >= 10]
    values19 = [v6(polynomial) for polynomial in eligible19]
    assert min(values19) >= 0
    counts[19] = len(eligible19)
    minima[19] = min(values19)
    local19 = min((v6(polynomial), polynomial) for polynomial in eligible19)
    if local19[0] < global_minimum:
        global_minimum = local19[0]
        minimum_record = [19, list(local19[1])]
    print("forest set 19", len(forest19), "eligible", len(eligible19), flush=True)

    # Order 20 connected trees are streamed.  Every disconnected forest has
    # a smallest component of order at most ten, so the second loop is
    # exhaustive without materializing the 1,425,505-row order-20 set.
    order20_count = 0
    order20_minimum = None
    order20_record = None
    connected_count = 0
    for tree in nx.nonisomorphic_trees(20):
        connected_count += 1
        polynomial = tree_polynomial(tree)
        if len(polynomial) - 1 < 10:
            continue
        order20_count += 1
        value = v6(polynomial)
        assert value >= 0
        if order20_minimum is None or value < order20_minimum:
            order20_minimum = value
            order20_record = polynomial
    assert connected_count == 823_065
    tree_census[20] = {
        "unlabeled": connected_count,
        "distinct_polynomials": None,
        "note": "streamed without retaining the order-20 tree-polynomial set",
    }
    disconnected_checks = 0
    for component_order in range(1, 11):
        for left in forests[20 - component_order]:
            left_poly = Poly(list(left))
            for right in tree_sets[component_order]:
                polynomial = tuple(int(value) for value in left_poly * Poly(list(right)))
                if len(polynomial) - 1 < 10:
                    continue
                disconnected_checks += 1
                value = v6(polynomial)
                assert value >= 0
                if value < order20_minimum:
                    order20_minimum = value
                    order20_record = polynomial
    counts[20] = order20_count + disconnected_checks
    minima[20] = order20_minimum
    if order20_minimum < global_minimum:
        global_minimum = order20_minimum
        minimum_record = [20, list(order20_record)]
    print("order20 connected", connected_count, "disconnected checks", disconnected_checks, flush=True)
    return {
        "tree_census": tree_census,
        "eligible_counts": counts,
        "minima": minima,
        "global_minimum": global_minimum,
        "minimum_record": minimum_record,
        "alpha9_negative": sorted(alpha9_negative),
        "order20_count_includes_duplicate_disconnected_products": True,
        "order20_count_semantics": (
            "coverage checks, not distinct polynomials: every connected "
            "tree instance plus every smallest-component product instance"
        ),
    }


def main() -> int:
    symbolic = symbolic_certificate()
    finite = finite_boundary()
    report = {
        "status": "PASS_EXACT_ALL_FOREST_V6_ALPHA_AT_LEAST_10",
        "symbolic": symbolic,
        "finite_order_at_most_20": finite,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("counts", finite["eligible_counts"])
    print("minima", finite["minima"])
    print("global", finite["global_minimum"], finite["minimum_record"])
    print("alpha9 negatives", len(finite["alpha9_negative"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
