#!/usr/bin/env python3
"""Independent audit of the branch-weight tau upper bound and n=28 table."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "tree_tau_branch_weight_upper_independent_audit_root_20260826.json"
PINNED = {
    "verify_tree_tau_branch_weight_upper_root.py":
        "9637273555B0CE1FABC42F458588443A96B1C2B234C93EC4BE05A1F0FE28CC89",
    "tree_tau_branch_weight_upper_exact_root_20260826.json":
        "8451E4F66AE62D05105B1618DE22DBED638CE922F906D15D0D6ACAE2DEDAA95B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rebuilt_table() -> dict[int, tuple[int, tuple[int, ...]]]:
    states: set[tuple[int, ...]] = set()
    stack = [()]
    while stack:
        weights = stack.pop()
        maximum = weights[-1] if weights else 25
        for value in range(1, maximum + 1):
            candidate = weights + (value,)
            if len(candidate) + sum(candidate) > 26:
                continue
            if candidate not in states:
                states.add(candidate)
                stack.append(candidate)

    table: dict[int, tuple[int, tuple[int, ...]]] = {}
    for weights in states:
        excess = sum(value * (value + 1) // 2 for value in weights)
        b3 = sum((value + 1) * value * (value - 1) // 6 for value in weights)
        largest = weights[0]
        upper = 3 * excess + b3 + largest * (sum(weights) - largest)
        candidate = (upper, weights)
        if excess not in table or candidate > table[excess]:
            table[excess] = candidate
    return table


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    producer = json.loads(
        (HERE / "tree_tau_branch_weight_upper_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert producer["status"] == "PASS_EXACT_TREE_TAU_BRANCH_WEIGHT_UPPER_AND_N28_TABLE"

    checked = 0
    minimum_linear_margin = None
    minimum_product_margin = None
    minimum_tau_margin = None
    for tree in nx.nonisomorphic_trees(15):
        order = tree.number_of_nodes()
        x = {vertex: tree.degree(vertex) - 1 for vertex in tree}
        y = {vertex: value - 1 for vertex, value in x.items() if value >= 2}
        if not y:
            continue
        nonleaves = [vertex for vertex, value in x.items() if value > 0]
        core = tree.subgraph(nonleaves)
        assert nx.is_tree(core)
        excess = sum(math.comb(value, 2) for value in x.values())
        b3 = sum(math.comb(value, 3) for value in x.values())
        edge_moment = sum(x[left] * x[right] for left, right in tree.edges())
        X = edge_moment - (order - 3)
        linear = sum((core.degree(vertex) - 1) * value for vertex, value in y.items())
        product = sum(y.get(left, 0) * y.get(right, 0) for left, right in core.edges())
        assert X == linear + product
        weights = tuple(sorted(y.values(), reverse=True))
        largest = weights[0]
        weight_sum = sum(weights)
        linear_margin = 2 * excess - linear
        product_margin = largest * (weight_sum - largest) - product
        tau = excess + b3 + X
        upper = 3 * excess + b3 + largest * (weight_sum - largest)
        tau_margin = upper - tau
        assert linear_margin >= 0 and product_margin >= 0 and tau_margin >= 0
        minimum_linear_margin = (
            linear_margin if minimum_linear_margin is None
            else min(minimum_linear_margin, linear_margin)
        )
        minimum_product_margin = (
            product_margin if minimum_product_margin is None
            else min(minimum_product_margin, product_margin)
        )
        minimum_tau_margin = (
            tau_margin if minimum_tau_margin is None
            else min(minimum_tau_margin, tau_margin)
        )
        checked += 1

    rebuilt = rebuilt_table()
    assert rebuilt[325] == (3575, (25,))
    nonstar = {key: value for key, value in rebuilt.items() if key <= 300}
    expected_rows = {
        int(row["e"]): (
            int(row["tau_upper"]),
            tuple(int(value) for value in row["maximizing_branch_weights"]),
        )
        for row in producer["order28"]["table"]
    }
    assert nonstar == expected_rows

    payload = {
        "schema": "tree-tau-branch-weight-upper-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_TREE_TAU_BRANCH_WEIGHT_UPPER_AND_N28_TABLE_AUDIT",
        "method": (
            "The audit imports no producer code. It reconstructs H, the linear and "
            "positive-edge terms in X on every order-15 tree, checks the two bounds "
            "separately, and rebuilds the n=28 partition table with an iterative state set."
        ),
        "tree_census": {
            "order": 15,
            "branching_trees": checked,
            "minimum_linear_margin": minimum_linear_margin,
            "minimum_product_margin": minimum_product_margin,
            "minimum_tau_margin": minimum_tau_margin,
        },
        "order28_table": {
            "matched_rows": len(nonstar),
            "maximum_nonstar_degree_surplus": max(nonstar),
            "star_row": {"e": 325, "tau_upper": 3575, "weights": [25]},
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits only the tau realizability theorem, not a Delta2 sign theorem.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("TREES", checked, "TABLE_ROWS", len(nonstar))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
