#!/usr/bin/env python3
"""Fail-closed certificate for the missing zero-root-neighbor rank-four floor.

This is an auxiliary lemma for the forest terminal m=1, target j=3 row.
It proves only that the zero-root-neighbor class contributes

    i_4(H) >= binom(|H|-3, 4),

with the right side interpreted as zero below order seven.  It does not
certify the terminal payment or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "terminal_q3_m1_forest_j3_h4_path_floor_independent_20260829.json"
ROOT_NOTE = HERE / "FOREST_M1_J3_ROOT_NEIGHBOR_CLASS_CAPS_ROOT_2026-08-29.md"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def p(n: int, k: int) -> int:
    return 0 if n < 2 * k - 1 else comb(n - k + 1, k)


def independent_count(g: nx.Graph, k: int) -> int:
    if k < 0 or k > len(g):
        return 0
    vertices = tuple(g.nodes())
    return sum(
        all(not g.has_edge(a, b) for a, b in itertools.combinations(chosen, 2))
        for chosen in itertools.combinations(vertices, k)
    )


def root_partition(g: nx.Graph, root: int) -> tuple[int, tuple[int, ...]]:
    """Return i4(F) and its exact classes by the number chosen in N(root)."""
    neighbors = set(g.neighbors(root))
    f_vertices = set(g) - {root}
    f = g.subgraph(f_vertices).copy()
    classes = [0] * 5
    for chosen in itertools.combinations(tuple(f), 4):
        if all(not f.has_edge(a, b) for a, b in itertools.combinations(chosen, 2)):
            classes[len(set(chosen) & neighbors)] += 1
    return sum(classes), tuple(classes)


def main() -> None:
    if not ROOT_NOTE.is_file():
        raise AssertionError("missing pinned root-neighbor class note")

    # The leaf recurrence is the all-order proof.  For a degree-one leaf v,
    # deletion and closed-neighborhood deletion have orders S-1 and S-2.
    S = sp.symbols("S", integer=True)
    P4 = sp.binomial(S - 3, 4)
    recurrence = sp.combsimp(
        sp.binomial(S - 4, 4) + sp.binomial(S - 4, 3) - P4
    )
    if recurrence != 0:
        raise AssertionError(f"Pascal recurrence failed: {recurrence}")

    # A path attains the same recurrence, hence proves sharpness.
    path_checks = 0
    for order in range(0, 18):
        path = nx.path_graph(order)
        got = independent_count(path, 4)
        want = p(order, 4)
        if got != want:
            raise AssertionError(("path equality", order, got, want))
        path_checks += 1

    # Literal all-forest replay through the complete graph atlas (orders <= 7).
    atlas_forests = 0
    atlas_floor_checks = 0
    atlas_root_partition_checks = 0
    atlas_zero_class_checks = 0
    for g0 in nx.graph_atlas_g():
        if len(g0) > 7 or (len(g0) and not nx.is_forest(g0)):
            continue
        g = nx.convert_node_labels_to_integers(g0)
        atlas_forests += 1
        got = independent_count(g, 4)
        want = p(len(g), 4)
        if got < want:
            raise AssertionError(("atlas floor", nx.to_graph6_bytes(g).strip(), got, want))
        atlas_floor_checks += 1
        for root in g:
            total, classes = root_partition(g, root)
            f = g.subgraph(set(g) - {root}).copy()
            if total != independent_count(f, 4) or total != sum(classes):
                raise AssertionError(("root partition", len(g), root, total, classes))
            h_vertices = set(g) - {root} - set(g.neighbors(root))
            h = g.subgraph(h_vertices).copy()
            if classes[0] != independent_count(h, 4):
                raise AssertionError(("zero class", len(g), root, classes[0]))
            if classes[0] < p(len(h), 4):
                raise AssertionError(("zero class floor", len(g), root, classes[0], len(h)))
            atlas_root_partition_checks += 1
            atlas_zero_class_checks += 1

    # Wider literal replay on every nonisomorphic tree through order 12.
    tree_checks = 0
    for order in range(2, 13):
        for tree in nx.generators.nonisomorphic_trees(order):
            got = independent_count(tree, 4)
            want = p(order, 4)
            if got < want:
                raise AssertionError(("tree floor", order, got, want))
            tree_checks += 1

    source_hash = sha256(Path(__file__))
    report = {
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_H4_PATH_FLOOR",
        "scope": (
            "Auxiliary zero-root-neighbor rank-four floor only; excludes the "
            "full terminal payment and Erdos Problem 993."
        ),
        "theorem": "For every S-vertex forest H, i4(H) >= P4(S)=C(S-3,4) for S>=7, else 0.",
        "sharpness": "Equality holds for the path P_S.",
        "all_order_proof": {
            "leaf_recurrence": "i4(H)=i4(H-v)+i3(H-N[v])",
            "orders": ["|H-v|=S-1", "|H-N[v]|=S-2"],
            "pascal_identity": "C(S-4,4)+C(S-4,3)=C(S-3,4)",
            "edgeless_case": "i4(H)=C(S,4)>=P4(S)",
        },
        "terminal_row_use": (
            "In the exact partition of i4(F) by the number of selected root "
            "neighbors, the zero-neighbor class is i4(H), so every valid lower "
            "bound for the remaining classes gains +P4(S)."
        ),
        "literal_replay": {
            "path_equalities": path_checks,
            "atlas_forests": atlas_forests,
            "atlas_floor_checks": atlas_floor_checks,
            "atlas_root_partition_checks": atlas_root_partition_checks,
            "atlas_zero_class_checks": atlas_zero_class_checks,
            "nonisomorphic_tree_floor_checks_orders_2_through_12": tree_checks,
        },
        "dependencies": {ROOT_NOTE.name: sha256(ROOT_NOTE)},
        "source_sha256": source_hash,
    }
    temp = REPORT.with_suffix(REPORT.suffix + ".tmp")
    temp.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, REPORT)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
