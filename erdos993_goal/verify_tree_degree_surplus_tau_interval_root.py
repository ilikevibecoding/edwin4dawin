#!/usr/bin/env python3
"""Exact joint interval for the rank-four tree surplus coordinate tau."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "tree_degree_surplus_tau_interval_exact_root_20260826.json"
EXPECTED = {
    "verify_rank4_tree_path_surplus_reserve_root.py":
        "719BE60CCF0660C71293690DED81B9120922F5823BCA27EF61CD334A109D4AEC",
    "rank4_tree_path_surplus_reserve_exact_root_20260826.json":
        "301944315BFBDADD40B6DB7B5BD4912D184F5FF6167C51BD32167BFC49BAEF97",
    "audit_rank4_tree_path_surplus_reserve_root.py":
        "472B2DC9D10573E6F628CB60BE8F96F16BE11A46E652ABC75CE0BE133D509027",
    "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json":
        "01F8D577C8F64B2E6B9CBADCB5D25FD8E2AD658B8ACD3C17722992016CE4E137",
    "RANK4_TREE_PATH_SURPLUS_RESERVE_THEOREM_2026-08-26.md":
        "495AB1C891C5CF6C542F80922C03A70F92BC6DC643F94611C95DB37316913481",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def statistics(tree: nx.Graph) -> tuple[int, int, int, int, int]:
    n = tree.number_of_nodes()
    weights = {vertex: tree.degree(vertex) - 1 for vertex in tree}
    e = sum(math.comb(value, 2) for value in weights.values())
    b3 = sum(math.comb(value, 3) for value in weights.values())
    edge_moment = sum(weights[u] * weights[v] for u, v in tree.edges())
    X = edge_moment - (n - 3)
    tau = e + b3 + X
    return n, e, b3, X, tau


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = json.loads(
        (HERE / "rank4_tree_path_surplus_reserve_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert upper["status"] == "PASS_EXACT_RANK4_TREE_PATH_SURPLUS_RESERVE_N15_PLUS"
    assert upper["equivalent_tau_bound"] == "tau<=(n-1)e/3"

    checked = 0
    minimum_lower_margin = None
    minimum_upper_margin = None
    lower_witness = None
    upper_witness = None
    for order in (15, 16):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            if max(dict(tree.degree()).values()) == order - 1:
                continue
            n, e, b3, X, tau = statistics(tree)
            mass = n - 2
            gamma_numerator = e * (2 * e - mass)
            lower_numerator = 3 * mass * (tau - e) - max(0, gamma_numerator)
            upper_numerator = (n - 1) * e - 3 * tau
            assert X >= 0
            assert 3 * mass * b3 >= gamma_numerator
            assert lower_numerator >= 0
            assert upper_numerator >= 0
            checked += 1
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            low_row = (lower_numerator, order, tree_index, e, b3, X, tau, graph6)
            high_row = (upper_numerator, order, tree_index, e, b3, X, tau, graph6)
            if lower_witness is None or low_row < lower_witness:
                minimum_lower_margin, lower_witness = lower_numerator, low_row
            if upper_witness is None or high_row < upper_witness:
                minimum_upper_margin, upper_witness = upper_numerator, high_row

    payload = {
        "schema": "tree-degree-surplus-tau-interval-root-v1",
        "status": "PASS_EXACT_NONSTAR_TREE_DEGREE_SURPLUS_TAU_INTERVAL_N15_PLUS",
        "theorem": (
            "For every nonstar n-vertex tree with n>=15, m=n-2, "
            "e=sum_v binomial(deg(v)-1,2), and "
            "i4=binomial(n-3,4)+(n-4)e-tau, one has "
            "e+max(0,e(2e-m)/(3m))<=tau<=(n-1)e/3."
        ),
        "lower_bound_proof": [
            "The positive x_v=deg(v)-1 vertices induce a nontrivial tree H.",
            "On each H-edge, x_u*x_v-1 >= (x_u-1)+(x_v-1); summing gives E>=m-1 and X=E-(m-1)>=0.",
            "Cauchy gives (2e)^2 <= m*(6B3+2e), hence B3>=e(2e-m)/(3m).",
            "The exact motif identity tau=e+B3+X proves the lower endpoint, with B3>=0 when the displayed expression is negative.",
        ],
        "upper_bound_proof": (
            "The pinned rank-four path-surplus theorem is equivalent to "
            "tau<=(n-1)e/3 for every tree of order n>=15."
        ),
        "star_boundary": (
            "The lower proof deliberately excludes the unique star, whose positive-x "
            "induced graph has one vertex. Stars are a separate literal family."
        ),
        "exact_census": {
            "orders": "15..16",
            "nonstar_trees": checked,
            "minimum_scaled_lower_margin": minimum_lower_margin,
            "lower_witness": list(lower_witness),
            "minimum_scaled_upper_margin": minimum_upper_margin,
            "upper_witness": list(upper_witness),
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is a coefficient-coordinate interval. It does not itself prove "
            "a rank-eight Delta tensor or Problem 993."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("TREES", checked)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
