#!/usr/bin/env python3
"""Exact branch-weight upper bound for the rank-four tree coordinate tau."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "tree_tau_branch_weight_upper_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def statistics(tree: nx.Graph) -> dict[str, object]:
    order = tree.number_of_nodes()
    x = {vertex: tree.degree(vertex) - 1 for vertex in tree}
    weights = tuple(sorted((value - 1 for value in x.values() if value >= 2), reverse=True))
    excess = sum(math.comb(value, 2) for value in x.values())
    b3 = sum(math.comb(value, 3) for value in x.values())
    edge_moment = sum(x[left] * x[right] for left, right in tree.edges())
    X = edge_moment - (order - 3)
    tau = excess + b3 + X
    return {
        "order": order,
        "weights": weights,
        "excess": excess,
        "B3": b3,
        "X": X,
        "tau": tau,
    }


def partition_upper(excess: int, weights: tuple[int, ...]) -> int:
    assert weights and all(weight >= 1 for weight in weights)
    assert excess == sum(weight * (weight + 1) // 2 for weight in weights)
    largest = weights[0]
    weight_sum = sum(weights)
    b3 = sum((weight + 1) * weight * (weight - 1) // 6 for weight in weights)
    return 3 * excess + b3 + largest * (weight_sum - largest)


def enumerate_order28_partitions() -> dict[int, tuple[int, tuple[int, ...]]]:
    rows: dict[int, tuple[int, tuple[int, ...]]] = {}

    def visit(maximum: int, weights: tuple[int, ...], weight_sum: int, excess: int) -> None:
        if weights:
            bound = partition_upper(excess, weights)
            old = rows.get(excess)
            candidate = (bound, weights)
            if old is None or candidate > old:
                rows[excess] = candidate
        for weight in range(maximum, 0, -1):
            # An n-vertex tree with branch weights y_i has exactly
            # 2+sum(y_i) leaves, so b+sum(y_i)<=n-2.
            if len(weights) + 1 + weight_sum + weight > 26:
                continue
            visit(
                weight,
                weights + (weight,),
                weight_sum + weight,
                excess + weight * (weight + 1) // 2,
            )

    visit(25, (), 0, 0)
    return rows


def main() -> None:
    # Literal verification of the identities and inequalities on every
    # nonisomorphic tree at two complete census orders.
    checked = 0
    minimum_margin = None
    minimum_witness = None
    for order in (15, 16):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            row = statistics(tree)
            weights = row["weights"]
            if not weights:
                continue
            excess = int(row["excess"])
            b3 = int(row["B3"])
            X = int(row["X"])
            tau = int(row["tau"])
            assert excess == sum(weight * (weight + 1) // 2 for weight in weights)
            assert b3 == sum(
                (weight + 1) * weight * (weight - 1) // 6 for weight in weights
            )
            assert len(weights) + sum(weights) <= order - 2
            upper = partition_upper(excess, weights)
            margin = upper - tau
            assert margin >= 0
            checked += 1
            witness = (
                margin,
                order,
                tree_index,
                excess,
                b3,
                X,
                tau,
                list(weights),
                nx.to_graph6_bytes(tree, header=False).decode().strip(),
            )
            if minimum_witness is None or witness < minimum_witness:
                minimum_margin, minimum_witness = margin, witness

    partitions = enumerate_order28_partitions()
    assert partitions[325][1] == (25,)
    assert 300 in partitions and max(key for key in partitions if key < 325) == 300
    assert not any(300 < key < 325 for key in partitions)
    nonstar = {key: value for key, value in partitions.items() if key <= 300}
    assert len(nonstar) == 207
    table = [
        {
            "e": excess,
            "tau_upper": bound,
            "maximizing_branch_weights": list(weights),
        }
        for excess, (bound, weights) in sorted(nonstar.items())
    ]

    payload = {
        "schema": "tree-tau-branch-weight-upper-root-v1",
        "status": "PASS_EXACT_TREE_TAU_BRANCH_WEIGHT_UPPER_AND_N28_TABLE",
        "theorem": (
            "For a nonpath tree, let y_i=deg(v_i)-2>=1 on its branch vertices, "
            "a=max_i y_i, S=sum_i y_i, e=sum_i binomial(y_i+1,2), and "
            "B3=sum_i binomial(y_i+1,3). Then tau<=3e+B3+a(S-a)."
        ),
        "proof": [
            "The nonleaf induced subgraph H is a tree. With x_v=deg(v)-1 and y_v=x_v-1, X=sum_v(deg_H(v)-1)y_v+sum_{uv in E(H)}y_u*y_v.",
            "Since deg_H(v)<=deg_T(v)=y_v+2, the first sum is at most sum_v y_v(y_v+1)=2e.",
            "The positive-y edges form a forest. Orient each component to a root, choosing the global-maximum vertex as its component root. Every edge product is at most a times its child weight, and the total child weight is at most S-a. Hence the second sum is at most a(S-a).",
            "The exact motif identity tau=e+B3+X gives the theorem.",
            "For order n, the degree-sum identity gives exactly S+2 leaves, hence b+S<=n-2. Exhausting the integer branch-weight partitions under this constraint gives the displayed order-28 table.",
        ],
        "order28": {
            "possible_nonstar_degree_surpluses": len(nonstar),
            "maximum_nonstar_degree_surplus": 300,
            "star_degree_surplus": 325,
            "star_branch_weights": [25],
            "table": table,
        },
        "exact_tree_census": {
            "orders": "15..16",
            "branching_trees": checked,
            "minimum_margin": minimum_margin,
            "minimum_witness": list(minimum_witness),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is a realizability bound for the rank-four coordinate tau. "
            "It does not itself prove a rank-eight residual or Problem 993."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("N28_NONSTAR_SURPLUSES", len(nonstar), "MAX", max(nonstar))
    print("TREES", checked, "MINIMUM_MARGIN", minimum_margin)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
