#!/usr/bin/env python3
"""Independent literal audit of the nonstar tree (e,tau) interval."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "tree_degree_surplus_tau_interval_independent_audit_root_20260826.json"
EXPECTED = {
    "verify_tree_degree_surplus_tau_interval_root.py":
        "24E054CD42BBCC67DE2BB0D675775EDAE3240D9A25913749A605CED1426EC5EF",
    "tree_degree_surplus_tau_interval_exact_root_20260826.json":
        "062A8B4383232A4AEB95324DF7ADBF0FEA1FF1DE1DA50D64A11EB9868487EDFB",
    "rank4_tree_path_surplus_reserve_exact_root_20260826.json":
        "301944315BFBDADD40B6DB7B5BD4912D184F5FF6167C51BD32167BFC49BAEF97",
    "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json":
        "01F8D577C8F64B2E6B9CBADCB5D25FD8E2AD658B8ACD3C17722992016CE4E137",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(left: list[int], right: list[int], cap: int = 4) -> list[int]:
    out = [0] * (min(cap, len(left) + len(right) - 2) + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= cap:
                out[i + j] += a * b
    return out


def add(left: list[int], right: list[int]) -> list[int]:
    return [
        (left[k] if k < len(left) else 0)
        + (right[k] if k < len(right) else 0)
        for k in range(max(len(left), len(right)))
    ]


def polynomial(tree: nx.Graph) -> list[int]:
    def visit(vertex: int, parent: int | None) -> tuple[list[int], list[int]]:
        absent, present = [1], [0, 1]
        for child in tree.neighbors(vertex):
            if child == parent:
                continue
            ca, cp = visit(child, vertex)
            absent = multiply(absent, add(ca, cp))
            present = multiply(present, ca)
        return absent, present

    absent, present = visit(next(iter(tree)), None)
    return add(absent, present)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "tree_degree_surplus_tau_interval_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert primary["status"] == (
        "PASS_EXACT_NONSTAR_TREE_DEGREE_SURPLUS_TAU_INTERVAL_N15_PLUS"
    )

    checked = 0
    minimum_lower = None
    minimum_upper = None
    for tree_index, tree in enumerate(nx.nonisomorphic_trees(15)):
        tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
        degrees = dict(tree.degree())
        if max(degrees.values()) == 14:
            continue
        weights = {vertex: degrees[vertex] - 1 for vertex in tree}
        positive = [vertex for vertex, value in weights.items() if value > 0]
        induced = tree.subgraph(positive)
        assert len(positive) >= 2
        assert nx.is_tree(induced)
        assert induced.number_of_edges() == len(positive) - 1

        n = 15
        mass = 13
        assert sum(weights.values()) == mass
        e = sum(math.comb(value, 2) for value in weights.values())
        b3 = sum(math.comb(value, 3) for value in weights.values())
        edge_moment = sum(weights[u] * weights[v] for u, v in tree.edges())
        X = edge_moment - 12
        # Rebuild the nonstar edge payment vertex by vertex.
        payment = sum(
            weights[u] * weights[v] - 1
            - (weights[u] - 1) - (weights[v] - 1)
            for u, v in induced.edges()
        )
        assert payment >= 0
        assert edge_moment >= 12
        assert X >= 0

        coefficients = polynomial(tree)
        i4 = coefficients[4]
        path_surplus = i4 - math.comb(12, 4)
        tau_from_i4 = 11 * e - path_surplus
        tau_from_motifs = e + b3 + X
        assert tau_from_i4 == tau_from_motifs
        tau = tau_from_i4

        cauchy_margin = mass * (6 * b3 + 2 * e) - (2 * e) ** 2
        assert cauchy_margin >= 0
        lower_margin = 3 * mass * (tau - e) - max(0, e * (2 * e - mass))
        upper_margin = 14 * e - 3 * tau
        assert lower_margin >= 0 and upper_margin >= 0
        minimum_lower = lower_margin if minimum_lower is None else min(minimum_lower, lower_margin)
        minimum_upper = upper_margin if minimum_upper is None else min(minimum_upper, upper_margin)
        checked += 1
    assert checked == 7_740

    payload = {
        "schema": "tree-degree-surplus-tau-interval-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_NONSTAR_TREE_DEGREE_SURPLUS_TAU_INTERVAL_AUDIT",
        "verified": [
            "the positive-x induced graph is rebuilt and checked to be a nontrivial tree",
            "the edge payment X>=0 is checked directly",
            "the Cauchy lower margin is recomputed in integer arithmetic",
            "tau=e+B3+X is matched to a fresh independence-polynomial i4 computation",
            "all 7,740 nonstar unlabeled order-15 trees satisfy both exact endpoints",
            "the separately audited rank-four theorem supplies the all-order upper endpoint",
        ],
        "literal_order15": {
            "nonstar_trees": checked,
            "minimum_scaled_lower_margin": minimum_lower,
            "minimum_scaled_upper_margin": minimum_upper,
        },
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
