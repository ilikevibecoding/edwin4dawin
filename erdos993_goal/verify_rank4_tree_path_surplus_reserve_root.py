#!/usr/bin/env python3
"""Derive the quantitative i4 path-surplus reserve from Zagreb coupling."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank4_tree_path_surplus_reserve_exact_root_20260826.json"
EXPECTED = {
    "verify_tree_rank45_path_ratio.py":
        "AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C",
    "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md":
        "7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(left: list[int], right: list[int], cap: int = 4) -> list[int]:
    answer = [0] * (min(cap, len(left) + len(right) - 2) + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= cap:
                answer[i + j] += a * b
    return answer


def add(left: list[int], right: list[int]) -> list[int]:
    return [
        (left[k] if k < len(left) else 0) + (right[k] if k < len(right) else 0)
        for k in range(max(len(left), len(right)))
    ]


def independence_prefix(tree: nx.Graph, cap: int = 4) -> list[int]:
    def visit(vertex: int, parent: int | None) -> tuple[list[int], list[int]]:
        excluded = [1]
        included = [0, 1]
        for child in tree.neighbors(vertex):
            if child == parent:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included), cap)
            included = multiply(included, child_excluded, cap)
        return excluded, included

    excluded, included = visit(next(iter(tree)), None)
    return add(excluded, included)


def statistics(tree: nx.Graph) -> tuple[int, int, int, int]:
    n = tree.number_of_nodes()
    weights = {v: tree.degree(v) - 1 for v in tree}
    B2 = sum(math.comb(value, 2) for value in weights.values())
    B3 = sum(math.comb(value, 3) for value in weights.values())
    E = sum(weights[u] * weights[v] for u, v in tree.edges())
    X = E - (n - 3)
    return n, B2, B3, X


def deterministic_trees(order: int) -> list[nx.Graph]:
    return [
        nx.path_graph(order),
        nx.star_graph(order - 1),
        nx.from_prufer_sequence([((j * j + 5 * j + 2) % order) for j in range(order - 2)]),
        nx.from_prufer_sequence([((13 * j + 7) % order) for j in range(order - 2)]),
    ]


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)

    n, B2, B3, X = sp.symbols("n B2 B3 X", nonnegative=True)
    D = (n - 5) * B2 - B3 - X
    zagreb_x_ceiling = (2 * (n - 4) * B2 - 6 * B3) / 7
    after_zagreb = sp.factor(D.subs(X, zagreb_x_ceiling))
    assert sp.factor(after_zagreb - ((5 * n - 27) * B2 - B3) / 7) == 0
    b3_ceiling = (n - 4) * B2 / 3
    final_lower = sp.factor(after_zagreb.subs(B3, b3_ceiling))
    assert sp.factor(final_lower - (2 * n - 11) * B2 / 3) == 0

    trees = 0
    minimum_margin = None
    minimum_witness = None
    for order in (15, 16):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            n_value, e_value, b3_value, x_value = statistics(tree)
            coefficients = independence_prefix(tree)
            i4 = coefficients[4] if len(coefficients) > 4 else 0
            path_i4 = math.comb(order - 3, 4)
            path_surplus = i4 - path_i4
            assert path_surplus == (
                (order - 5) * e_value - b3_value - x_value
            )
            margin = 3 * path_surplus - (2 * order - 11) * e_value
            assert margin >= 0
            trees += 1
            row = (
                margin, order, tree_index, path_surplus, e_value,
                b3_value, x_value,
                nx.to_graph6_bytes(tree, header=False).decode().strip(),
            )
            if minimum_witness is None or row < minimum_witness:
                minimum_margin = margin
                minimum_witness = row

    large_checks = 0
    minimum_large_margin = None
    minimum_large_witness = None
    for order in (28, 29, 34, 40, 80, 200):
        for family_index, tree in enumerate(deterministic_trees(order)):
            n_value, e_value, b3_value, x_value = statistics(tree)
            i4 = independence_prefix(tree)[4]
            path_surplus = i4 - math.comb(order - 3, 4)
            margin = 3 * path_surplus - (2 * order - 11) * e_value
            assert path_surplus == (order - 5) * e_value - b3_value - x_value
            assert margin >= 0
            large_checks += 1
            row = (margin, order, family_index, path_surplus, e_value)
            if minimum_large_witness is None or row < minimum_large_witness:
                minimum_large_margin = margin
                minimum_large_witness = row

    payload = {
        "schema": "rank4-tree-path-surplus-reserve-root-v1",
        "status": "PASS_EXACT_RANK4_TREE_PATH_SURPLUS_RESERVE_N15_PLUS",
        "theorem": (
            "For every n-vertex tree T with n>=15 and "
            "e=sum_v binomial(deg(v)-1,2), one has "
            "i4(T)-binomial(n-3,4)>=(2n-11)e/3."
        ),
        "equivalent_tau_bound": "tau<=(n-1)e/3",
        "proof": {
            "motif_identity": (
                "With B2=e, B3=sum binomial(deg(v)-1,3), "
                "X=sum_edges (deg(u)-1)(deg(v)-1)-(n-3), the exact identity is "
                "i4(T)-i4(P_n)=(n-5)B2-B3-X."
            ),
            "zagreb_input": "7X<=2(n-4)B2-6B3 for every tree n>=15.",
            "degree_moment_input": "B3<=(n-4)B2/3.",
            "derived_chain": [
                "D>=((5n-27)B2-B3)/7",
                "D>=(2n-11)B2/3",
            ],
        },
        "exact_census": {
            "orders": "15..16", "trees": trees,
            "minimum_cleared_margin": minimum_margin,
            "minimum_witness": list(minimum_witness),
        },
        "large_family_checks": {
            "checks": large_checks,
            "minimum_cleared_margin": minimum_large_margin,
            "minimum_witness": list(minimum_large_witness),
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is a rank-four coefficient coupling theorem. It does not by "
            "itself prove a pending Delta tensor or Problem 993."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("TREES", trees, "LARGE", large_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
