#!/usr/bin/env python3
"""Exact all-order one-root-neighbor pair-exclusion cap for forest m1,j3."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "terminal_q3_m1_forest_j3_pair_exclusion_cap_independent_20260829.json"
ROOT_NOTE = HERE / "FOREST_M1_J3_ROOT_NEIGHBOR_CLASS_CAPS_ROOT_2026-08-29.md"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent_subsets(g: nx.Graph, k: int):
    vertices = tuple(g.nodes())
    for chosen in itertools.combinations(vertices, k):
        if all(not g.has_edge(a, b) for a, b in itertools.combinations(chosen, 2)):
            yield frozenset(chosen)


def check_marked(g: nx.Graph, root: int):
    U = frozenset(g.neighbors(root))
    d = len(U)
    f_vertices = frozenset(g) - {root}
    h_vertices = f_vertices - U
    F = g.subgraph(f_vertices).copy()
    H = g.subgraph(h_vertices).copy()
    S = len(H)
    hpairs = tuple(independent_subsets(H, 2))
    htriples = tuple(independent_subsets(H, 3))
    ftriples = tuple(independent_subsets(F, 3))
    B1 = sum(len(chosen & U) == 1 for chosen in ftriples)
    pair_extensions = 0
    minimum_pair_extensions = d if not hpairs else None
    for pair in hpairs:
        compatible = sum(
            all(not F.has_edge(u, vertex) for vertex in pair)
            for u in U
        )
        pair_extensions += compatible
        if minimum_pair_extensions is None or compatible < minimum_pair_extensions:
            minimum_pair_extensions = compatible
    if pair_extensions != B1:
        raise AssertionError(("B1 incidence identity", len(g), root, pair_extensions, B1))
    if B1 < (d - 2) * len(hpairs):
        raise AssertionError(("pair exclusion", len(g), root, B1, d, len(hpairs)))
    # Every independent H-pair extends to at most S-2 H-triples.
    if 3 * len(htriples) > (S - 2) * len(hpairs):
        raise AssertionError(("downsampling", len(g), root, S, len(hpairs), len(htriples)))
    b = len(ftriples)
    cap_checked = False
    if d >= 2 and S >= 3 and b:
        denominator = S - 2 + 3 * (d - 2)
        if denominator <= 0:
            raise AssertionError(("cap denominator", len(g), root, denominator))
        if denominator * len(htriples) > (S - 2) * b:
            raise AssertionError(("cap", len(g), root, denominator, len(htriples), b))
        cap_checked = True
    return len(hpairs), pair_extensions, cap_checked, minimum_pair_extensions


def main() -> None:
    if not ROOT_NOTE.is_file():
        raise AssertionError("missing root-neighbor class note")

    # Symbolic replay of the two chained inequalities after clearing S-2.
    S, d, h2, h3, B1, b = sp.symbols("S d h2 h3 B1 b")
    cap_gap = sp.expand((S - 2) * b - (S - 2 + 3 * (d - 2)) * h3)
    decomposition = sp.expand(
        (S - 2) * (b - h3 - B1)
        + (S - 2) * (B1 - (d - 2) * h2)
        + (d - 2) * ((S - 2) * h2 - 3 * h3)
    )
    if sp.expand(cap_gap - decomposition) != 0:
        raise AssertionError("cap slack decomposition failed")

    atlas_forests = atlas_marked = atlas_caps = atlas_pairs = atlas_inc = 0
    minimum_extension_slack = None
    for g0 in nx.graph_atlas_g():
        if len(g0) > 7 or (len(g0) and not nx.is_forest(g0)):
            continue
        g = nx.convert_node_labels_to_integers(g0)
        atlas_forests += 1
        for root in g:
            pairs, incidences, cap_checked, minimum = check_marked(g, root)
            atlas_marked += 1
            atlas_pairs += pairs
            atlas_inc += incidences
            atlas_caps += cap_checked
            if minimum is not None:
                slack = minimum - (g.degree(root) - 2)
                minimum_extension_slack = slack if minimum_extension_slack is None else min(
                    minimum_extension_slack, slack
                )

    tree_marked = tree_caps = tree_pairs = tree_inc = 0
    for order in range(2, 13):
        for g in nx.generators.nonisomorphic_trees(order):
            for root in g:
                pairs, incidences, cap_checked, _minimum = check_marked(g, root)
                tree_marked += 1
                tree_pairs += pairs
                tree_inc += incidences
                tree_caps += cap_checked

    report = {
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_PAIR_EXCLUSION_CAP",
        "scope": (
            "Auxiliary y=h3/f3 upper bound for marked forests with d>=2,S>=3; "
            "does not prove the full terminal row, m=0, or Erdos Problem 993."
        ),
        "theorem": {
            "one_root_class": "B1 >= (d-2) h2",
            "downsampling": "3 h3 <= (S-2) h2",
            "cap": "h3/f3 <= (S-2)/(S-2+3(d-2))",
            "positive_denominator_domain": "d>=2 and S>=3",
        },
        "proof": (
            "The root-neighbor sets X_u in H are pairwise disjoint. Each "
            "independent H-pair therefore excludes at most two of the d root "
            "neighbors, and its compatible-root incidences count B1 exactly."
        ),
        "literal_replay": {
            "atlas_forests": atlas_forests,
            "atlas_marked_cells": atlas_marked,
            "atlas_cap_cells": atlas_caps,
            "atlas_independent_H_pairs": atlas_pairs,
            "atlas_pair_root_incidences": atlas_inc,
            "atlas_minimum_extension_slack_over_d_minus_2": minimum_extension_slack,
            "nonisomorphic_tree_marked_cells_orders_2_through_12": tree_marked,
            "nonisomorphic_tree_cap_cells": tree_caps,
            "nonisomorphic_tree_independent_H_pairs": tree_pairs,
            "nonisomorphic_tree_pair_root_incidences": tree_inc,
        },
        "dependencies": {ROOT_NOTE.name: sha256(ROOT_NOTE)},
        "source_sha256": sha256(Path(__file__)),
    }
    temp = REPORT.with_suffix(REPORT.suffix + ".tmp")
    temp.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, REPORT)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
