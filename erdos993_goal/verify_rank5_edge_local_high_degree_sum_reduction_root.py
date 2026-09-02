#!/usr/bin/env python3
"""Verify the high-degree-sum part of the rank-five edge-local route.

The all-order proof is symbolic and is recorded in the companion theorem note.
The nonisomorphic-tree census here is an independent bounded diagnostic; it is
not used to promote any of the remaining low-degree endpoint types.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_edge_local_high_degree_sum_reduction_exact_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolution(left: list[int], right: list[int], cap: int) -> list[int]:
    product = [0] * min(cap + 1, len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= cap:
                product[i + j] += a * b
    return product


def add(left: list[int], right: list[int], cap: int) -> list[int]:
    length = min(cap + 1, max(len(left), len(right)))
    return [
        (left[i] if i < len(left) else 0)
        + (right[i] if i < len(right) else 0)
        for i in range(length)
    ]


def independence_coefficients(forest: nx.Graph, cap: int) -> list[int]:
    """Return i_0,...,i_cap by a literal rooted-forest dynamic program."""

    total = [1]
    seen: set[int] = set()
    for root in forest:
        if root in seen:
            continue
        parent = {root: None}
        order = [root]
        seen.add(root)
        for vertex in order:
            for neighbor in forest[vertex]:
                if neighbor == parent[vertex]:
                    continue
                assert neighbor not in parent, "input must be a forest"
                parent[neighbor] = vertex
                seen.add(neighbor)
                order.append(neighbor)

        excluded: dict[int, list[int]] = {}
        included: dict[int, list[int]] = {}
        for vertex in reversed(order):
            out = [1]
            inside = [0, 1]
            for child in forest[vertex]:
                if parent.get(child) != vertex:
                    continue
                out = convolution(out, add(excluded[child], included[child], cap), cap)
                inside = convolution(inside, excluded[child], cap)
            excluded[vertex] = out
            included[vertex] = inside
        total = convolution(total, add(excluded[root], included[root], cap), cap)
    return total + [0] * (cap + 1 - len(total))


def symbolic_certificate() -> dict[str, str]:
    n = sp.symbols("n", integer=True)
    endpoint = (
        5 * (n - 7) * sp.binomial(n - 4, 5)
        - (n - 2) * (n - 3) * sp.binomial(n - 7, 4)
    )
    factored = (n - 8) * (n - 7) * (n**3 - 6 * n**2 - 37 * n + 150) / 12
    # SymPy's binomial object needs expansion before the polynomial identity is
    # visible.  Replacing it by falling factorials keeps the replay exact.
    falling_endpoint = (
        5 * (n - 7) * sp.prod(n - 4 - j for j in range(5)) / sp.factorial(5)
        - (n - 2)
        * (n - 3)
        * sp.prod(n - 7 - j for j in range(4))
        / sp.factorial(4)
    )
    assert sp.expand(falling_endpoint - factored) == 0
    t = sp.symbols("t", nonnegative=True)
    positivity_shift = sp.expand(
        (n**3 - 6 * n**2 - 37 * n + 150).subs(n, t + 11)
    )
    assert positivity_shift == t**3 + 27 * t**2 + 194 * t + 348
    return {
        "path_minimality_induction": (
            "For a leaf v with neighbor u, i_k(T)=i_k(T-v)+i_(k-1)(T-{u,v}); "
            "join components of the latter forest, apply induction, and use "
            "C(n-k,k)+C(n-k,k-1)=C(n-k+1,k)."
        ),
        "endpoint_expression": str(endpoint),
        "falling_factorization": str(sp.factor(falling_endpoint)),
        "positive_cubic_at_n_11_plus_t": str(positivity_shift),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=2)
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    assert 2 <= args.min_order <= args.max_order

    totals = {
        "trees": 0,
        "edges": 0,
        "high_degree_sum_edges": 0,
        "active_high_degree_sum_edges": 0,
        "negative_high_degree_sum_margins": 0,
        "negative_all_edge_margins_diagnostic": 0,
    }
    per_order: list[dict[str, object]] = []
    minimum_active_high = None
    minimum_all_active = None

    for n in range(args.min_order, args.max_order + 1):
        local_trees = 0
        local_high = 0
        local_active_high = 0
        local_minimum_high = None
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            i5 = independence_coefficients(tree, 5)[5]
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            totals["trees"] += 1
            local_trees += 1
            for u, v in tree.edges():
                degree_u = tree.degree(u)
                degree_v = tree.degree(v)
                c = degree_u + degree_v - 2
                removed = {u, v, *tree.neighbors(u), *tree.neighbors(v)}
                residual = tree.subgraph(set(tree) - removed).copy()
                h = residual.number_of_nodes()
                assert h == n - degree_u - degree_v
                i4_residual = independence_coefficients(residual, 4)[4]
                margin = 5 * h * i5 - (n - 2) * (n - 3) * i4_residual
                witness = {
                    "margin": margin,
                    "order": n,
                    "tree_index": index,
                    "graph6": code,
                    "edge": sorted((u, v)),
                    "endpoint_degrees": sorted((degree_u, degree_v)),
                    "c": c,
                    "h": h,
                    "i5_tree": i5,
                    "i4_residual": i4_residual,
                }
                totals["edges"] += 1
                if i4_residual > 0 and (
                    minimum_all_active is None
                    or (margin, n, index, u, v) < minimum_all_active[0]
                ):
                    minimum_all_active = ((margin, n, index, u, v), witness)
                if margin < 0:
                    totals["negative_all_edge_margins_diagnostic"] += 1

                if c < 5:
                    continue
                totals["high_degree_sum_edges"] += 1
                local_high += 1
                if i4_residual > 0:
                    totals["active_high_degree_sum_edges"] += 1
                    local_active_high += 1
                    key = (margin, n, index, u, v)
                    if minimum_active_high is None or key < minimum_active_high[0]:
                        minimum_active_high = (key, witness)
                    if local_minimum_high is None or key < local_minimum_high[0]:
                        local_minimum_high = (key, witness)
                if margin < 0:
                    totals["negative_high_degree_sum_margins"] += 1

        per_order.append(
            {
                "order": n,
                "trees": local_trees,
                "high_degree_sum_edges": local_high,
                "active_high_degree_sum_edges": local_active_high,
                "minimum_active_high_degree_sum_witness": (
                    None if local_minimum_high is None else local_minimum_high[1]
                ),
            }
        )
        print(
            f"EDGE_LOCAL_HIGH_DEGREE_ORDER {n} TREES {local_trees} "
            f"HIGH_EDGES {local_high} ACTIVE_HIGH {local_active_high}",
            flush=True,
        )

    assert totals["negative_high_degree_sum_margins"] == 0
    payload = {
        "schema": "rank5-edge-local-high-degree-sum-reduction-v1",
        "status": "PASS_EXACT_ALL_ORDER_HIGH_DEGREE_SUM_REDUCTION_BOUNDED_AUDIT",
        "theorem": (
            "For every tree T and edge uv with deg(u)+deg(v)-2>=5, "
            "(n-2)(n-3)i4(T-N[u]-N[v])<=5(n-deg(u)-deg(v))i5(T)."
        ),
        "symbolic_certificate": symbolic_certificate(),
        "bounded_census": {
            "orders": [args.min_order, args.max_order],
            "totals": totals,
            "per_order": per_order,
            "minimum_active_high_degree_sum_witness": (
                None if minimum_active_high is None else minimum_active_high[1]
            ),
            "minimum_all_active_edge_witness_diagnostic": (
                None if minimum_all_active is None else minimum_all_active[1]
            ),
        },
        "remaining_endpoint_degree_pairs": [
            [1, 2],
            [1, 3],
            [2, 2],
            [1, 4],
            [2, 3],
            [1, 5],
            [2, 4],
            [3, 3],
        ],
        "proof_boundary": (
            "The companion note includes a self-contained leaf induction for the "
            "coefficientwise path lower bound, so the c>=5 edge theorem has no "
            "external theorem dependency. The census does not prove any c<=4 edge."
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
