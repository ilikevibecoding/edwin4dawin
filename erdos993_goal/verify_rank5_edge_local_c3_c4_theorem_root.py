#!/usr/bin/env python3
"""Exact replay for all rank-five edge-local types with c=3 or c=4."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import networkx as nx
import sympy as sp

from verify_rank5_edge_local_degree2_degree2_theorem_root import (
    independent,
    independence_coefficients,
    literal_incidence_audit,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_edge_local_c3_c4_theorem_exact_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value: int, rank: int) -> int:
    return math.comb(value, rank) if value >= rank >= 0 else 0


def compositions(total: int, length: int):
    if length == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for rest in compositions(total - first, length - 1):
            yield (first,) + rest


def symbolic_pointwise_certificate() -> dict[str, object]:
    """Reconstruct the c=3 and c=4 pointwise slack polynomials."""

    def symbolic_choose(value, rank):
        return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)

    def universal_layer(variables, selected_roots, rank):
        if selected_roots < 0:
            return sp.Integer(0)
        value = 0
        for profile in compositions(selected_roots, len(variables)):
            multiplicity = sp.prod(
                symbolic_choose(variable, amount)
                for variable, amount in zip(variables, profile)
            )
            compatible = sum(amount == 0 for amount in profile)
            if rank == 4:
                weight = 2 * selected_roots + 5 * compatible
            elif rank == 3:
                weight = 5 * sp.binomial(compatible + 1, 2)
            elif rank == 2:
                weight = 5 * sp.binomial(compatible, 3)
            elif rank == 1:
                weight = 5 * sp.binomial(compatible, 4)
            else:
                weight = 5 * sp.binomial(compatible, 5)
            value += multiplicity * weight
        return sp.expand(value)

    def reconstructed(variables, nonroot_rank, payment):
        root_count = 4 - nonroot_rank
        value = sum(
            universal_layer(variables, rank - nonroot_rank, rank)
            for rank in range(4, nonroot_rank - 1, -1)
        )
        return sp.expand(
            value - payment * symbolic_choose(sum(variables), root_count)
        )

    result: dict[str, object] = {}

    # c=3, payment 9.
    x = sp.symbols("x0:3", integer=True, nonnegative=True)
    sum_x = sum(x)
    sum_c2 = sum(symbolic_choose(value, 2) for value in x)
    sum_c3 = sum(symbolic_choose(value, 3) for value in x)
    sum_c4 = sum(symbolic_choose(value, 4) for value in x)
    e2 = sum(x[i] * x[j] for i in range(3) for j in range(i + 1, 3))
    e3 = sp.prod(x)
    ordered_c2_x = sum(
        symbolic_choose(x[i], 2) * x[j]
        for i in range(3)
        for j in range(3)
        if i != j
    )
    ordered_c3_x = sum(
        symbolic_choose(x[i], 3) * x[j]
        for i in range(3)
        for j in range(3)
        if i != j
    )
    pair_c2 = sum(
        symbolic_choose(x[i], 2) * symbolic_choose(x[j], 2)
        for i in range(3)
        for j in range(i + 1, 3)
    )
    doubled_three = sum(
        symbolic_choose(x[i], 2) * x[(i + 1) % 3] * x[(i + 2) % 3]
        for i in range(3)
    )
    explicit3 = {
        4: sp.Integer(6),
        3: 3 * sum_x + 30,
        2: 5 * sum_c2 + 15 * sum_x + 5,
        1: 7 * sum_c3 + 2 * ordered_c2_x - 3 * e3 + 15 * sum_c2 + 5 * e2,
        0: (
            9 * sum_c4
            + 4 * ordered_c3_x
            + 4 * pair_c2
            - doubled_three
            + 15 * sum_c3
            + 5 * ordered_c2_x
        ),
    }
    for rank in range(5):
        actual = reconstructed(x, rank, 9)
        assert sp.expand(actual - explicit3[rank]) == 0
    pay3_rank1 = sum(
        x[i] * x[j] * (x[i] + x[j] + 3)
        for i in range(3)
        for j in range(i + 1, 3)
    ) - 3 * e3
    assert sp.expand(
        explicit3[1] - pay3_rank1 - 7 * sum_c3 - 15 * sum_c2
    ) == 0
    pay3_rank0 = 0
    for i in range(3):
        j, k = tuple(vertex for vertex in range(3) if vertex != i)
        pay3_rank0 += symbolic_choose(x[i], 2) * (
            2 * (symbolic_choose(x[j], 2) + symbolic_choose(x[k], 2))
            + 5 * (x[j] + x[k])
            - x[j] * x[k]
        )
    assert sp.expand(
        explicit3[0]
        - pay3_rank0
        - 9 * sum_c4
        - 4 * ordered_c3_x
        - 15 * sum_c3
    ) == 0
    result["c3_payment"] = 9
    result["c3_pointwise_slacks"] = {
        str(rank): str(sp.factor(explicit3[rank])) for rank in range(5)
    }
    result["c3_rank1_payment_remainder"] = str(sp.factor(pay3_rank1))
    result["c3_rank0_payment_remainder"] = str(sp.factor(pay3_rank0))

    # c=4, payment 12.
    y = sp.symbols("y0:4", integer=True, nonnegative=True)
    sum_y = sum(y)
    sum_y_c2 = sum(symbolic_choose(value, 2) for value in y)
    sum_y_c3 = sum(symbolic_choose(value, 3) for value in y)
    sum_y_c4 = sum(symbolic_choose(value, 4) for value in y)
    y_e2 = sum(y[i] * y[j] for i in range(4) for j in range(i + 1, 4))
    y_e3 = sum(
        y[i] * y[j] * y[k]
        for i in range(4)
        for j in range(i + 1, 4)
        for k in range(j + 1, 4)
    )
    y_e4 = sp.prod(y)
    y_ordered_c2_x = sum(
        symbolic_choose(y[i], 2) * y[j]
        for i in range(4)
        for j in range(4)
        if i != j
    )
    y_ordered_c3_x = sum(
        symbolic_choose(y[i], 3) * y[j]
        for i in range(4)
        for j in range(4)
        if i != j
    )
    y_pair_c2 = sum(
        symbolic_choose(y[i], 2) * symbolic_choose(y[j], 2)
        for i in range(4)
        for j in range(i + 1, 4)
    )
    y_doubled_three = sum(
        symbolic_choose(y[i], 2)
        * sum(
            y[j] * y[k]
            for j in range(4)
            for k in range(j + 1, 4)
            if i not in (j, k)
        )
        for i in range(4)
    )
    explicit4 = {
        4: sp.Integer(8),
        3: 5 * sum_y + 50,
        2: 7 * sum_y_c2 + 2 * y_e2 + 30 * sum_y + 20,
        1: (
            9 * sum_y_c3
            + 4 * y_ordered_c2_x
            - y_e3
            + 30 * sum_y_c2
            + 15 * y_e2
            + 5 * sum_y
            + 5
        ),
        0: (
            11 * sum_y_c4
            + 6 * y_ordered_c3_x
            + 6 * y_pair_c2
            + y_doubled_three
            - 4 * y_e4
            + 30 * sum_y_c3
            + 15 * y_ordered_c2_x
            + 5 * sum_y_c2
            + 5 * y_e3
        ),
    }
    for rank in range(5):
        actual = reconstructed(y, rank, 12)
        assert sp.expand(actual - explicit4[rank]) == 0
    pay4_rank1 = 4 * y_ordered_c2_x + 15 * y_e2 - y_e3
    assert sp.expand(
        explicit4[1]
        - pay4_rank1
        - 9 * sum_y_c3
        - 30 * sum_y_c2
        - 5 * sum_y
        - 5
    ) == 0
    pay4_rank0 = y_doubled_three + 5 * y_e3 - 4 * y_e4
    assert sp.expand(
        explicit4[0]
        - pay4_rank0
        - 11 * sum_y_c4
        - 6 * y_ordered_c3_x
        - 6 * y_pair_c2
        - 30 * sum_y_c3
        - 15 * y_ordered_c2_x
        - 5 * sum_y_c2
    ) == 0
    result["c4_payment"] = 12
    result["c4_pointwise_slacks"] = {
        str(rank): str(sp.factor(explicit4[rank])) for rank in range(5)
    }
    result["c4_rank1_payment_remainder"] = str(sp.factor(pay4_rank1))
    result["c4_rank0_payment_remainder"] = str(sp.factor(pay4_rank0))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=5)
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    assert 5 <= args.min_order <= args.max_order

    totals = {
        "trees": 0,
        "c3_edges": 0,
        "c4_edges": 0,
        "independent_four_sets_in_residuals": 0,
        "upward_incidences": 0,
        "downward_sources": 0,
        "negative_universal_pointwise_margins": 0,
        "negative_edge_local_margins": 0,
    }
    endpoint_types: dict[str, int] = {}
    per_order: list[dict[str, int]] = []
    minimum_universal_active = {3: None, 4: None}
    minimum_positive_edge_margin = None

    for n in range(args.min_order, args.max_order + 1):
        local_trees = 0
        local_c3 = 0
        local_c4 = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            totals["trees"] += 1
            local_trees += 1
            i5_tree = independence_coefficients(tree, 5)[5]
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for u, v in tree.edges():
                c = tree.degree(u) + tree.degree(v) - 2
                if c not in (3, 4):
                    continue
                if c == 3:
                    totals["c3_edges"] += 1
                    local_c3 += 1
                    payment = 9
                else:
                    totals["c4_edges"] += 1
                    local_c4 += 1
                    payment = 12
                degree_pair = tuple(sorted((tree.degree(u), tree.degree(v))))
                endpoint_types[str(degree_pair)] = endpoint_types.get(str(degree_pair), 0) + 1
                left_boundary = tuple(sorted(vertex for vertex in tree[u] if vertex != v))
                right_boundary = tuple(sorted(vertex for vertex in tree[v] if vertex != u))
                boundary = left_boundary + right_boundary
                assert len(boundary) == c and len(set(boundary)) == c
                residual = tree.copy()
                residual.remove_nodes_from((u, v, *boundary))
                groups: list[frozenset[int]] = []
                for root in left_boundary:
                    groups.append(frozenset(tree[root]) - {u})
                for root in right_boundary:
                    groups.append(frozenset(tree[root]) - {v})
                child_roots = frozenset().union(*groups) if groups else frozenset()
                assert len(child_roots) == sum(map(len, groups))
                assert child_roots <= set(residual)
                states = {
                    rank: [
                        frozenset(chosen)
                        for chosen in itertools.combinations(tuple(residual), rank)
                        if independent(residual, chosen)
                    ]
                    for rank in range(5)
                }
                a = independence_coefficients(residual, 5)
                assert len(states[4]) == a[4]
                upward, downward, degree_sum = literal_incidence_audit(
                    residual, tuple(sorted(child_roots)), states[4]
                )
                z_total = sum(len(state & child_roots) for state in states[4])
                assert z_total + upward == 4 * a[4]

                exact_extra = 0
                universal_extra = 0
                for rank in range(4, -1, -1):
                    for state in states[rank]:
                        compatible_by_group = [not bool(state & group) for group in groups]
                        compatible_left = sum(compatible_by_group[: len(left_boundary)])
                        compatible_right = sum(compatible_by_group[len(left_boundary) :])
                        compatible = compatible_left + compatible_right
                        if rank == 4:
                            exact_weight = universal_weight = compatible
                        elif rank == 3:
                            exact_weight = universal_weight = choose(compatible + 1, 2)
                        elif rank == 2:
                            exact_weight = (
                                choose(compatible, 3)
                                + choose(compatible_left, 2)
                                + choose(compatible_right, 2)
                            )
                            universal_weight = choose(compatible, 3)
                        elif rank == 1:
                            exact_weight = (
                                choose(compatible, 4)
                                + choose(compatible_left, 3)
                                + choose(compatible_right, 3)
                            )
                            universal_weight = choose(compatible, 4)
                        else:
                            exact_weight = (
                                choose(compatible, 5)
                                + choose(compatible_left, 4)
                                + choose(compatible_right, 4)
                            )
                            universal_weight = choose(compatible, 5)
                        exact_extra += exact_weight
                        universal_extra += universal_weight
                assert exact_extra >= universal_extra
                predicted_i5 = a[5] + 2 * a[4] + exact_extra
                assert predicted_i5 == i5_tree

                universal_margin = 2 * z_total + 5 * universal_extra - payment * a[4]
                assert universal_margin >= 0
                totals["negative_universal_pointwise_margins"] += universal_margin < 0
                if a[4] and (
                    minimum_universal_active[c] is None
                    or universal_margin < minimum_universal_active[c][0]
                ):
                    minimum_universal_active[c] = (
                        universal_margin,
                        {
                            "universal_margin": universal_margin,
                            "order": n,
                            "tree_index": index,
                            "graph6": code,
                            "edge": sorted((u, v)),
                            "endpoint_degrees": list(degree_pair),
                            "c": c,
                            "h": residual.number_of_nodes(),
                            "a4": a[4],
                            "Z": z_total,
                            "universal_extra": universal_extra,
                            "exact_extra": exact_extra,
                        },
                    )

                extension_lower = (
                    (residual.number_of_nodes() - 4) * a[4] - degree_sum
                )
                assert 5 * a[5] >= extension_lower
                assert degree_sum <= 2 * upward
                h = residual.number_of_nodes()
                edge_margin = 5 * h * i5_tree - (n - 2) * (n - 3) * a[4]
                assert edge_margin >= 0
                totals["negative_edge_local_margins"] += edge_margin < 0
                if edge_margin > 0 and (
                    minimum_positive_edge_margin is None
                    or (edge_margin, n, index, u, v) < minimum_positive_edge_margin[0]
                ):
                    minimum_positive_edge_margin = (
                        (edge_margin, n, index, u, v),
                        {
                            "edge_local_margin": edge_margin,
                            "order": n,
                            "tree_index": index,
                            "graph6": code,
                            "edge": sorted((u, v)),
                            "endpoint_degrees": list(degree_pair),
                            "c": c,
                            "h": h,
                            "i5_tree": i5_tree,
                            "i4_residual": a[4],
                        },
                    )
                totals["independent_four_sets_in_residuals"] += a[4]
                totals["upward_incidences"] += upward
                totals["downward_sources"] += downward

        per_order.append(
            {"order": n, "trees": local_trees, "c3_edges": local_c3, "c4_edges": local_c4}
        )
        print(
            f"C3_C4_ORDER {n} TREES {local_trees} C3_EDGES {local_c3} C4_EDGES {local_c4}",
            flush=True,
        )

    assert totals["negative_universal_pointwise_margins"] == 0
    assert totals["negative_edge_local_margins"] == 0
    payload = {
        "schema": "rank5-edge-local-c3-c4-theorem-v1",
        "status": "PASS_EXACT_ALL_ORDER_C3_C4_EDGE_THEOREM_BOUNDED_INJECTION_AUDIT",
        "theorem": (
            "Every tree edge with c=deg(u)+deg(v)-2 in {3,4} satisfies "
            "(n-2)(n-3)i4(T-N[u]-N[v])<=5(n-deg(u)-deg(v))i5(T)."
        ),
        "symbolic_pointwise_certificate": symbolic_pointwise_certificate(),
        "bounded_census": {
            "orders": [args.min_order, args.max_order],
            "totals": totals,
            "endpoint_types": endpoint_types,
            "per_order": per_order,
            "minimum_universal_active": {
                str(c): None if row is None else row[1]
                for c, row in minimum_universal_active.items()
            },
            "minimum_positive_edge_margin": (
                None if minimum_positive_edge_margin is None else minimum_positive_edge_margin[1]
            ),
        },
        "proof_boundary": (
            "The companion note proves the universal c=3 payment 9 and c=4 "
            "payment 12 pointwise for all child-group sizes.  The bounded census "
            "audits the exact endpoint-split coefficient row and incidence map."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
