#!/usr/bin/env python3
"""Prove the attachment-root strengthening of the rooted-deletion floor."""

from __future__ import annotations

import hashlib
import json
import sys
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_root_deletion_attachment_floor_exact_root_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if rank < len(row) else 0


def attachment_components(tree: nx.Graph, root: int) -> list[tuple[set[int], int, int]]:
    boundary = set(tree.neighbors(root))
    far = set(tree) - boundary - {root}
    answer = []
    for component in nx.connected_components(tree.subgraph(far)):
        cut_edges = [
            (u, v)
            for u in component
            for v in tree.neighbors(u)
            if v in boundary
        ]
        assert len(cut_edges) == 1
        attachment, boundary_vertex = cut_edges[0]
        answer.append((set(component), attachment, boundary_vertex))
    return answer


def deterministic_trees(order: int) -> list[nx.Graph]:
    return [
        nx.path_graph(order),
        nx.star_graph(order - 1),
        nx.from_prufer_sequence([((j * j + 5 * j + 2) % order) for j in range(order - 2)]),
        nx.from_prufer_sequence([((13 * j + 7) % order) for j in range(order - 2)]),
    ]


def main() -> None:
    sys.setrecursionlimit(20_000)
    trees_checked = roots_checked = active_rank_cells = attachment_components_checked = 0
    minimum_slack = None
    minimum_witness = None
    for order in range(2, 14):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            deleted, whole = all_root_states(tree, 8)
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            trees_checked += 1
            for root in tree:
                components = attachment_components(tree, root)
                attachment_components_checked += len(components)
                roots_checked += 1
                for rank in range(2, 9):
                    c_rank = coefficient(whole, rank)
                    if not c_rank:
                        continue
                    h_rank = coefficient(deleted[root], rank)
                    a_rank = c_rank - h_rank
                    if not a_rank:
                        continue
                    # With s=k-1, the attachment-root incidence argument gives
                    # k*h >= (n-1-3s)*a = (n-3k+2)*a.
                    multiplier = order - 3 * rank + 2
                    slack = rank * h_rank - multiplier * a_rank
                    assert slack >= 0
                    active_rank_cells += 1
                    row = (
                        slack,
                        order,
                        tree_index,
                        root,
                        tree.degree(root),
                        rank,
                        h_rank,
                        a_rank,
                        multiplier,
                        graph6,
                    )
                    if minimum_slack is None or row < minimum_witness:
                        minimum_slack = slack
                        minimum_witness = row

    # Direct live-rank checks at larger orders with the existing exact rooted
    # DP. These are audit support; the incidence proof itself is all-order.
    large_trees = large_roots = 0
    minimum_rank7_slack = None
    minimum_rank7_witness = None
    for order in (28, 29, 31, 40, 80, 120, 200):
        floor = Fraction(order - 19, order - 12)
        for family_index, tree in enumerate(deterministic_trees(order)):
            deleted, whole = all_root_states(tree, 8)
            c7 = coefficient(whole, 7)
            if not c7:
                continue
            large_trees += 1
            for root in tree:
                h7 = coefficient(deleted[root], 7)
                slack = h7 * floor.denominator - c7 * floor.numerator
                assert slack >= 0
                large_roots += 1
                row = (
                    slack,
                    order,
                    family_index,
                    root,
                    tree.degree(root),
                    h7,
                    c7,
                )
                if minimum_rank7_slack is None or row < minimum_rank7_witness:
                    minimum_rank7_slack = slack
                    minimum_rank7_witness = row

    samples = []
    for order in (20, 21, 28, 31, 40, 80, 200, 1000):
        floor = Fraction(order - 19, order - 12)
        samples.append(
            {
                "order": order,
                "rank7_floor": str(floor),
                "decimal": f"{float(floor):.18g}",
            }
        )

    payload = {
        "schema": "rank8-root-deletion-attachment-floor-root-v1",
        "status": "PASS_EXACT_ALL_ORDER_ROOT_DELETION_ATTACHMENT_FLOOR",
        "theorem": (
            "For every n-vertex tree T, root q, rank k>=2, H=T-N[q], "
            "a=i_(k-1)(H), and h=i_k(T-q), one has "
            "k*h >= (n-3k+2)*a."
        ),
        "proof": {
            "unique_attachments": (
                "Each component of H has exactly one cut edge to N(q): no cut "
                "edge would disconnect T, while two would create a cycle. Root "
                "the component at its endpoint in H."
            ),
            "augmented_selected_degree": (
                "For all independent s-sets R of H, the downward-to-upward "
                "incidence injection gives downward incidences <= selected "
                "nonroot incidences. Adding the attachment incidence of each "
                "selected component root, the total internal-degree plus "
                "attachment-incidence sum is at most 2s*i_s(H)."
            ),
            "extensions": (
                "The neighborhood in T-q of R is bounded by that augmented "
                "incidence sum. Hence the mean number of one-vertex extensions "
                "is at least n-1-3s. The extension-pair sum counts each "
                "independent (s+1)-set of T-q at most s+1=k times."
            ),
        },
        "rank8_corollary": {
            "definition": "Z=i7(T-q)/i7(T)",
            "range": "n>=20",
            "bound": "Z>=(n-19)/(n-12)",
            "t_form": "Z>=(1-19t)/(1-12t), t=1/n",
            "samples": samples,
        },
        "exact_checks": {
            "small_tree_census": {
                "orders": "2..13",
                "trees": trees_checked,
                "roots": roots_checked,
                "attachment_components": attachment_components_checked,
                "active_rank_cells": active_rank_cells,
                "minimum_slack": minimum_slack,
                "minimum_witness": list(minimum_witness) if minimum_witness else None,
            },
            "large_rank7_families": {
                "trees": large_trees,
                "roots": large_roots,
                "minimum_slack": minimum_rank7_slack,
                "minimum_witness": list(minimum_rank7_witness) if minimum_rank7_witness else None,
            },
        },
        "scope_warning": (
            "This is an all-order realizability constraint, not by itself a "
            "Delta tensor, Q8, PGC, or Erdos Problem 993 proof."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
