#!/usr/bin/env python3
"""Exact replay for the exceptional rank-six pendant-PGC boundary.

Let G be a forest with pendant edge lp, let B=G-{l,p}, and write

    I(G) = (1+x) I(B) + x C.

The all-forest rank-six reserve and the V6 theorem reduce the only difficult
case to alpha(B)=9 and V6(B)<0.  This replay independently reconstructs all
forest independence polynomials of order at most 18, proves that exactly
twelve rows satisfy those conditions, proves from i1 and i2 that every such
row is connected, and exhausts every rooted tree and every possible C for
those rows.  It then checks the exact coupled pendant margin.

The finite enumeration is an exhaustive proof boundary, not a sample:
every forest is bipartite, so alpha(B)=9 implies |B|<=18.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp
from flint import fmpz_poly as Poly


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent
X = Poly([0, 1])

EXPECTED_TREE_COUNTS = (
    1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159,
    7741, 19320, 48629, 123867,
)
EXPECTED_FOREST_POLYNOMIAL_COUNTS = (
    1, 2, 3, 6, 10, 20, 36, 73, 142, 294, 618, 1348, 2974,
    6777, 15739, 37524, 90965, 224562,
)
EXPECTED_NEGATIVE_ROWS: tuple[Polynomial, ...] = (
    (1, 16, 105, 365, 724, 822, 507, 150, 18, 1),
    (1, 16, 105, 365, 724, 822, 508, 153, 19, 1),
    (1, 16, 105, 365, 724, 822, 509, 156, 21, 1),
    (1, 16, 105, 366, 732, 844, 531, 159, 18, 1),
    (1, 16, 105, 366, 732, 844, 532, 161, 19, 1),
    (1, 16, 105, 366, 732, 845, 536, 165, 19, 1),
    (1, 16, 105, 366, 732, 845, 537, 168, 21, 1),
    (1, 16, 105, 366, 733, 850, 543, 168, 20, 1),
    (1, 16, 105, 366, 733, 850, 544, 171, 22, 1),
    (1, 16, 105, 367, 740, 867, 559, 171, 18, 1),
    (1, 16, 105, 367, 741, 872, 568, 178, 20, 1),
    (1, 17, 120, 455, 1001, 1287, 924, 330, 45, 1),
)


def coeff(poly: Polynomial, rank: int) -> int:
    return poly[rank] if rank < len(poly) else 0


def multiply(left: Polynomial, right: Polynomial) -> Polynomial:
    return tuple(int(value) for value in Poly(list(left)) * Poly(list(right)))


def tree_polynomial(tree: nx.Graph) -> Polynomial:
    """Independence polynomial of a nonempty tree by exact rooted DP."""

    root = next(iter(tree.nodes))

    def visit(vertex: int, parent: int | None) -> tuple[Poly, Poly]:
        excluded = Poly([1])
        included_base = Poly([1])
        for child in tree[vertex]:
            if child == parent:
                continue
            child_excluded, child_included_base = visit(child, vertex)
            excluded *= child_excluded + X * child_included_base
            included_base *= child_excluded
        return excluded, included_base

    excluded, included_base = visit(root, None)
    return tuple(int(value) for value in excluded + X * included_base)


def forest_polynomial(forest: nx.Graph) -> Polynomial:
    result: Polynomial = (1,)
    for vertices in nx.connected_components(forest):
        component = forest.subgraph(vertices)
        result = multiply(result, tree_polynomial(component))
    return result


def v6(poly: Polynomial) -> int:
    b4, b5, b6 = (coeff(poly, rank) for rank in (4, 5, 6))
    return 4 * b4 * b5 + 39 * b4 * b6 - 25 * b5 * b5


def q6(poly: Polynomial) -> int:
    p5, p6, p7 = (coeff(poly, rank) for rank in (5, 6, 7))
    return 12 * p6 * p6 - p5 * p6 - 14 * p5 * p7


def h(poly: Polynomial, rank: int) -> Fraction:
    previous = coeff(poly, rank - 1)
    value = coeff(poly, rank)
    following = coeff(poly, rank + 1)
    return (
        Fraction(rank * rank * (value * value - previous * following), previous)
        + rank * (value - following)
    )


def pendant_polynomial(base: Polynomial, deletion: Polynomial) -> Polynomial:
    degree = max(len(base) + 1, len(deletion) + 1)
    values = []
    for rank in range(degree):
        values.append(
            coeff(base, rank)
            + coeff(base, rank - 1) if rank >= 1 else coeff(base, rank)
        )
        if rank >= 1:
            values[-1] += coeff(deletion, rank - 1)
    while len(values) > 1 and values[-1] == 0:
        values.pop()
    return tuple(values)


def frac(value: Fraction) -> dict[str, object]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "text": str(value),
        "decimal": float(value),
    }


def symbolic_certificate() -> dict[str, str]:
    p5, p6, p7, b4, b5, b6, b7, c4, c5, c6 = sp.symbols(
        "p5 p6 p7 b4 b5 b6 b7 c4 c5 c6", positive=True
    )
    h6 = 36 * (p6**2 - p5 * p7) / p5 + 6 * (p6 - p7)
    h5 = 25 * (b5**2 - b4 * b6) / b4 + 5 * (b5 - b6)
    q = 12 * p6**2 - p5 * p6 - 14 * p5 * p7
    v = 4 * b4 * b5 + 39 * b4 * b6 - 25 * b5**2
    substitutions = {
        p5: b4 + b5 + c4,
        p6: b5 + b6 + c5,
        p7: b6 + b7 + c6,
    }
    residual = sp.factor((h6 - h5 - 3 * q / p5 - 9 * c5 - v / b4).subs(substitutions))
    assert residual == 0
    cleared = "3*b4*Q6(P)+9*c5*p5*b4+V6(B)*p5"
    return {
        "identity": "H6(P)-H5(B)=3*Q6(P)/p5+9*c5+V6(B)/b4",
        "cleared_numerator": cleared,
        "pendant_coefficients": (
            "p5=b4+b5+c4; p6=b5+b6+c5; p7=b6+b7+c6"
        ),
    }


def graph6(tree: nx.Graph) -> str:
    return nx.to_graph6_bytes(tree, header=False).decode("ascii").strip()


def enumerate_boundary() -> dict[str, object]:
    maximum_order = 18
    expected = set(EXPECTED_NEGATIVE_ROWS)
    tree_sets: list[set[Polynomial]] = [set() for _ in range(maximum_order + 1)]
    rooted: dict[Polynomial, dict[str, object]] = {}
    tree_counts: list[int] = []

    for order in range(1, maximum_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        count = 0
        for tree in trees:
            count += 1
            polynomial = tree_polynomial(tree)
            tree_sets[order].add(polynomial)
            if polynomial not in expected:
                continue
            record = rooted.setdefault(
                polynomial,
                {
                    "tree_count": 0,
                    "rooted_vertex_occurrences": 0,
                    "states": {},
                    "first_graph6": graph6(tree),
                },
            )
            record["tree_count"] += 1
            for vertex in tree.nodes:
                reduced = tree.copy()
                reduced.remove_node(vertex)
                deletion = forest_polynomial(reduced)
                record["rooted_vertex_occurrences"] += 1
                states = record["states"]
                states.setdefault(
                    deletion,
                    {
                        "mode": "support_attached_to_root",
                        "graph6": graph6(tree),
                        "root": int(vertex),
                    },
                )
        assert count == EXPECTED_TREE_COUNTS[order - 1]
        tree_counts.append(count)
        print(
            f"trees order={order} unlabeled={count} "
            f"polynomials={len(tree_sets[order])}",
            flush=True,
        )

    forests: list[set[Polynomial]] = [set() for _ in range(maximum_order + 1)]
    forests[0].add((1,))
    forest_counts: list[int] = []
    negative_rows: list[tuple[int, Polynomial, int]] = []
    for order in range(1, maximum_order + 1):
        current: set[Polynomial] = set()
        for component_order in range(1, order + 1):
            for left in forests[order - component_order]:
                for right in tree_sets[component_order]:
                    current.add(multiply(left, right))
        forests[order] = current
        assert len(current) == EXPECTED_FOREST_POLYNOMIAL_COUNTS[order - 1]
        forest_counts.append(len(current))
        for polynomial in current:
            if len(polynomial) - 1 == 9 and v6(polynomial) < 0:
                negative_rows.append((order, polynomial, v6(polynomial)))
        print(
            f"forests order={order} distinct_polynomials={len(current)}",
            flush=True,
        )

    discovered = {polynomial for _, polynomial, _ in negative_rows}
    assert discovered == expected
    assert len(negative_rows) == 12
    assert all(polynomial in rooted for polynomial in discovered)

    # From i1=n and i2=C(n,2)-|E|, a forest row has
    # components=n-|E|=n-C(n,2)+i2.  Thus every exceptional row is a tree,
    # so C is either B itself (the K2 component is separate) or I(B-v) for
    # one vertex v of a tree realizing B.
    for order, polynomial, _ in negative_rows:
        components = order - comb(order, 2) + coeff(polynomial, 2)
        assert components == 1

    # The reserve theorem starts at order 13.  Its only missing part in the
    # required alpha(G)>=10 range is a finite check at orders 10,11,12.
    small_q_checks = 0
    small_q_minimum: tuple[int, int, Polynomial] | None = None
    for order in range(10, 13):
        for polynomial in forests[order]:
            if len(polynomial) - 1 < 10:
                continue
            value = q6(polynomial)
            assert value >= 0
            small_q_checks += 1
            candidate = (value, order, polynomial)
            if small_q_minimum is None or candidate < small_q_minimum:
                small_q_minimum = candidate
    assert small_q_minimum is not None
    assert small_q_checks == 94
    assert small_q_minimum == (
        43_624,
        12,
        (1, 12, 55, 140, 230, 262, 212, 120, 45, 10, 1),
    )

    rows = []
    global_minimum: tuple[Fraction, dict[str, object]] | None = None
    total_matching_trees = 0
    total_root_occurrences = 0
    total_distinct_states = 0
    for order, base, value_v6 in sorted(negative_rows):
        record = rooted[base]
        states: dict[Polynomial, dict[str, object]] = dict(record["states"])
        states.setdefault(
            base,
            {
                "mode": "support_leaf_component_isolated_from_B",
                "graph6": record["first_graph6"],
                "root": None,
            },
        )
        row_minimum: tuple[Fraction, dict[str, object]] | None = None
        q_minimum = None
        numerator_minimum = None
        for deletion, representative in states.items():
            full = pendant_polynomial(base, deletion)
            assert len(full) - 1 == 10
            p5 = coeff(full, 5)
            b4 = coeff(base, 4)
            c5 = coeff(deletion, 5)
            value_q6 = q6(full)
            assert value_q6 >= 0
            cleared = (
                3 * b4 * value_q6
                + 9 * c5 * p5 * b4
                + value_v6 * p5
            )
            margin = h(full, 6) - h(base, 5)
            decomposition = (
                Fraction(3 * value_q6, p5)
                + 9 * c5
                + Fraction(value_v6, b4)
            )
            assert margin == decomposition
            assert margin == Fraction(cleared, p5 * b4)
            assert cleared >= 0 and margin >= 0
            witness = {
                "B": list(base),
                "C": list(deletion),
                "P": list(full),
                "Q6_P": value_q6,
                "V6_B": value_v6,
                "c5": c5,
                "cleared_numerator": cleared,
                "margin": frac(margin),
                "representative": representative,
            }
            candidate = (margin, witness)
            if row_minimum is None or candidate[0] < row_minimum[0]:
                row_minimum = candidate
            if global_minimum is None or candidate[0] < global_minimum[0]:
                global_minimum = candidate
            q_minimum = value_q6 if q_minimum is None else min(q_minimum, value_q6)
            numerator_minimum = (
                cleared if numerator_minimum is None else min(numerator_minimum, cleared)
            )
        assert row_minimum is not None
        total_matching_trees += int(record["tree_count"])
        total_root_occurrences += int(record["rooted_vertex_occurrences"])
        total_distinct_states += len(states)
        rows.append(
            {
                "order_B": order,
                "B": list(base),
                "V6_B": value_v6,
                "matching_unlabeled_trees": record["tree_count"],
                "rooted_vertex_occurrences": record["rooted_vertex_occurrences"],
                "distinct_C_polynomials_including_unattached": len(states),
                "minimum_Q6_P": q_minimum,
                "minimum_cleared_numerator": numerator_minimum,
                "minimum_margin": row_minimum[1],
            }
        )

    assert global_minimum is not None
    assert total_matching_trees == 12
    assert total_root_occurrences == 193
    assert total_distinct_states == 157
    assert global_minimum[0] == Fraction(2_306_335_815, 123_623)
    assert global_minimum[1]["B"] == [
        1, 16, 105, 365, 724, 822, 509, 156, 21, 1,
    ]
    assert global_minimum[1]["C"] == [
        1, 15, 91, 287, 503, 485, 240, 54, 5,
    ]
    return {
        "exhaustive_scope": {
            "reason_order_at_most_18": (
                "B is a forest, hence bipartite; alpha(B)=9 implies |B|<=18"
            ),
            "tree_counts_by_order_1_to_18": tree_counts,
            "distinct_forest_polynomial_counts_by_order_1_to_18": forest_counts,
            "negative_alpha9_V6_rows": len(negative_rows),
            "negative_row_orders": {
                "16": sum(order == 16 for order, _, _ in negative_rows),
                "17": sum(order == 17 for order, _, _ in negative_rows),
            },
            "all_negative_rows_have_component_count": 1,
        },
        "small_order_Q6_base": {
            "scope": "all forest polynomials with order<=12 and alpha>=10",
            "checks": small_q_checks,
            "minimum_Q6": small_q_minimum[0],
            "minimum_order": small_q_minimum[1],
            "minimum_polynomial": list(small_q_minimum[2]),
        },
        "exceptional_pendant_scan": {
            "matching_unlabeled_trees": total_matching_trees,
            "rooted_vertex_occurrences": total_root_occurrences,
            "distinct_B_C_polynomial_checks": total_distinct_states,
            "rows": rows,
            "global_minimum": global_minimum[1],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "rank6_component_pgc_boundary_exact_20260813.json",
    )
    args = parser.parse_args()
    result = {
        "status": "PASS_EXACT_ALL_FOREST_RANK6_PGC_BOUNDARY",
        "theorem": (
            "For every forest G with pendant edge lp and alpha(G)>=10, "
            "H6(I(G))>=H5(I(G-{l,p})), assuming the cited all-order Q6 "
            "and V6 inputs."
        ),
        "symbolic": symbolic_certificate(),
        "boundary": enumerate_boundary(),
        "dependencies": [
            "RANK6_FOREST_THREE_HALVES_THEOREM_2026-08-13.md",
            "FOREST_V6_ALPHA10_THEOREM_2026-08-13.md",
        ],
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    script_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    output_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    scan = result["boundary"]["exceptional_pendant_scan"]
    print(result["status"])
    print(f"output={args.output}")
    print(f"script_sha256={script_hash}")
    print(f"output_sha256={output_hash}")
    print(
        f"negative_rows={len(scan['rows'])} "
        f"matching_trees={scan['matching_unlabeled_trees']} "
        f"root_occurrences={scan['rooted_vertex_occurrences']} "
        f"distinct_B_C_checks={scan['distinct_B_C_polynomial_checks']}"
    )
    print(f"minimum_margin={scan['global_minimum']['margin']['text']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
