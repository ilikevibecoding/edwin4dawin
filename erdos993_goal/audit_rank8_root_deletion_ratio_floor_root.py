#!/usr/bin/env python3
"""Independent literal audit of the all-order rooted-deletion ratio lemma."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_root_deletion_ratio_floor_independent_audit_root_20260825.json"
EXPECTED = {
    "verify_rank8_root_deletion_ratio_floor_root.py":
        "53B98D1ACC7F216A638CA2CEACEB03D2C054AD6957AF511475275220A4948C1F",
    "rank8_root_deletion_ratio_floor_exact_root_20260825.json":
        "D7C629DDC696647839165C4FC5BB9082DDDE90BB51F6B27DC120ECC3DBCAD3B6",
    "RANK8_ROOT_DELETION_RATIO_FLOOR_THEOREM_2026-08-25.md":
        "07B04ED37C1C1FC4DBBCCF834B2D8BB32BDEF0827BD72A4A926342E2998FE998",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent_sets_by_rank(tree: nx.Graph, vertices: tuple[int, ...]) -> list[int]:
    counts = [0] * (len(vertices) + 1)
    edges = tuple((vertices.index(u), vertices.index(v)) for u, v in tree.edges())
    for mask in range(1 << len(vertices)):
        if any((mask >> u) & 1 and (mask >> v) & 1 for u, v in edges):
            continue
        counts[mask.bit_count()] += 1
    return counts


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    producer = json.loads(
        (HERE / "rank8_root_deletion_ratio_floor_exact_root_20260825.json")
        .read_text(encoding="utf-8")
    )
    assert producer["status"] == "PASS_EXACT_ALL_ORDER_ROOT_DELETION_RATIO_FLOOR"
    assert producer["rank8_corollary"]["universal_bound"] == (
        "Z>=binomial(n-7,7)/(binomial(n-7,7)+binomial(n-2,6))"
    )

    pascal_checks = 0
    for n in range(2, 100):
        for k in range(1, min(25, n + 2)):
            def choose(top: int, bottom: int) -> int:
                return math.comb(top, bottom) if top >= bottom >= 0 else 0

            assert choose(n - k, k) + choose(n - k, k - 1) == choose(n - k + 1, k)
            assert choose(n - 2, k) + choose(n - 2, k - 1) == choose(n - 1, k)
            pascal_checks += 2

    trees = roots = active = 0
    minimum = None
    witness = None
    for n in range(2, 12):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(n)):
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            vertices = tuple(range(n))
            whole = independent_sets_by_rank(tree, vertices)
            trees += 1
            for root in vertices:
                remaining = tuple(v for v in vertices if v != root)
                deleted = independent_sets_by_rank(tree.subgraph(remaining).copy(), remaining)
                roots += 1
                degree = tree.degree(root)
                closed = {root, *tree.neighbors(root)}
                far = tuple(v for v in vertices if v not in closed)
                far_counts = independent_sets_by_rank(tree.subgraph(far).copy(), far)
                for k in range(2, n + 1):
                    c_value = whole[k]
                    if not c_value:
                        continue
                    h_value = deleted[k] if k < len(deleted) else 0
                    a_value = far_counts[k - 1] if k - 1 < len(far_counts) else 0
                    assert c_value == h_value + a_value
                    L = math.comb(n - k, k) if n - k >= k else 0
                    A = (
                        math.comb(n - degree - 1, k - 1)
                        if n - degree - 1 >= k - 1
                        else 0
                    )
                    assert h_value >= L and a_value <= A
                    slack = h_value * (L + A) - c_value * L
                    assert slack >= 0
                    active += 1
                    row = (
                        slack,
                        n,
                        tree_index,
                        root,
                        degree,
                        k,
                        h_value,
                        a_value,
                        c_value,
                        nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    )
                    if minimum is None or row < witness:
                        minimum = slack
                        witness = row

    payload = {
        "schema": "rank8-root-deletion-ratio-floor-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_ROOT_DELETION_RATIO_FLOOR_AUDIT",
        "method": (
            "No producer imports. Fresh bit-mask independent-set enumeration, "
            "fresh deletion recurrence, degree-sensitive cross multiplication, "
            "and independent Pascal checks."
        ),
        "pascal_checks": pascal_checks,
        "literal_census": {
            "orders": "2..11",
            "trees": trees,
            "roots": roots,
            "active_checks": active,
            "minimum_scaled_slack": minimum,
            "minimum_witness": list(witness) if witness else None,
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
