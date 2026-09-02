#!/usr/bin/env python3
"""Independent symbolic and literal audit of the tree i4 path reserve."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json"
EXPECTED = {
    "verify_rank4_tree_path_surplus_reserve_root.py":
        "719BE60CCF0660C71293690DED81B9120922F5823BCA27EF61CD334A109D4AEC",
    "rank4_tree_path_surplus_reserve_exact_root_20260826.json":
        "301944315BFBDADD40B6DB7B5BD4912D184F5FF6167C51BD32167BFC49BAEF97",
    "verify_tree_rank45_path_ratio.py":
        "AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C",
    "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md":
        "7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial(tree: nx.Graph, cap: int = 4) -> list[int]:
    def mul(left: list[int], right: list[int]) -> list[int]:
        out = [0] * (min(cap, len(left) + len(right) - 2) + 1)
        for i, a in enumerate(left):
            for j, b in enumerate(right):
                if i + j <= cap:
                    out[i + j] += a * b
        return out

    def add(left: list[int], right: list[int]) -> list[int]:
        return [
            (left[k] if k < len(left) else 0) + (right[k] if k < len(right) else 0)
            for k in range(max(len(left), len(right)))
        ]

    def visit(vertex: int, parent: int | None) -> tuple[list[int], list[int]]:
        excluded, included = [1], [0, 1]
        for child in tree.neighbors(vertex):
            if child == parent:
                continue
            ce, ci = visit(child, vertex)
            excluded = mul(excluded, add(ce, ci))
            included = mul(included, ce)
        return excluded, included

    return add(*visit(next(iter(tree)), None))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank4_tree_path_surplus_reserve_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert primary["status"] == "PASS_EXACT_RANK4_TREE_PATH_SURPLUS_RESERVE_N15_PLUS"

    n, e, b3, X = sp.symbols("n e b3 X", nonnegative=True)
    D = (n - 5) * e - b3 - X
    zagreb = sp.Le(X, (2 * (n - 4) * e - 6 * b3) / 7)
    after = sp.factor(D.subs(X, zagreb.rhs))
    assert sp.factor(after - ((5 * n - 27) * e - b3) / 7) == 0
    assert sp.factor(
        after.subs(b3, (n - 4) * e / 3) - (2 * n - 11) * e / 3
    ) == 0

    checked = 0
    minimum = None
    witness = None
    for tree_index, tree in enumerate(nx.nonisomorphic_trees(15)):
        tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
        weights = {v: tree.degree(v) - 1 for v in tree}
        e_value = sum(math.comb(value, 2) for value in weights.values())
        b3_value = sum(math.comb(value, 3) for value in weights.values())
        x_value = sum(weights[u] * weights[v] for u, v in tree.edges()) - 12
        i4 = polynomial(tree)[4]
        surplus = i4 - math.comb(12, 4)
        assert surplus == 10 * e_value - b3_value - x_value
        margin = 3 * surplus - 19 * e_value
        assert margin >= 0
        checked += 1
        row = (margin, tree_index, surplus, e_value,
               nx.to_graph6_bytes(tree, header=False).decode().strip())
        if witness is None or row < witness:
            minimum, witness = margin, row
    assert checked == 7_741

    payload = {
        "schema": "rank4-tree-path-surplus-reserve-independent-audit-v1",
        "status": "PASS_INDEPENDENT_RANK4_TREE_PATH_SURPLUS_RESERVE_AUDIT",
        "verified": [
            "the motif identity and both inequality substitutions are rebuilt without producer imports",
            "the final reserve simplifies exactly to (2n-11)e/3",
            "all 7,741 unlabeled order-15 trees pass under a fresh coefficient DP",
            "the pinned Zagreb theorem covers every order n>=15",
        ],
        "literal_order15": {
            "trees": checked, "minimum_cleared_margin": minimum,
            "minimum_witness": list(witness),
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
