#!/usr/bin/env python3
"""Resolve the recursive sibling Theta-core gap into five phase blocks.

This is a discovery aid for the proof of the q>=4 cross-phase identity
in ``derive_sibling_theta_core_recursive_gap.py``.  It computes the
changes in the root-indicator, phi, psi, chi, and constant-M blocks
separately and audits which natural groupings are nonnegative.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import networkx as nx

from verify_two_copy_sharp_lambda_leaf_identity import residual_h_c


def phase_rows(
    graph: nx.Graph,
    rank: int,
    root: int | None,
    support: int | None = None,
) -> list[dict[str, int]]:
    if rank < 0:
        return []
    root_neighbors = set(graph[root]) if root is not None else set()
    support_neighbors = (
        set(graph[support]) if support is not None else set()
    )
    rows: list[dict[str, int]] = []
    for vertices in itertools.combinations(graph, rank):
        chosen = frozenset(vertices)
        if any(
            left in chosen and right in chosen
            for left, right in graph.edges()
        ):
            continue
        h_value, c_value = residual_h_c(graph, chosen)
        x = int(root not in chosen) if root is not None else 0
        y = int(x and bool(chosen & root_neighbors))
        a = (
            int(support not in chosen)
            if support is not None
            else 0
        )
        b = (
            int(a and bool(chosen & support_neighbors))
            if support is not None
            else 0
        )
        rows.append(
            {
                "h": h_value,
                "c": c_value,
                "x": x,
                "y": y,
                "a": a,
                "b": b,
            }
        )
    return rows


def updated(rows: list[dict[str, int]]) -> list[dict[str, int]]:
    return [
        {
            **row,
            "h": row["h"] + row["a"],
            "c": row["c"] + row["b"],
        }
        for row in rows
    ]


def doubled_core_blocks(
    rank_q: int,
    a_rows: list[dict[str, int]],
    m_rows: list[dict[str, int]],
    p_rows: list[dict[str, int]],
) -> dict[str, int]:
    count_a = len(a_rows)
    absent_a = sum(row["x"] for row in a_rows)
    root_block = -4 * absent_a * (count_a - absent_a)

    phi = 0
    for left in a_rows:
        for right in m_rows:
            phi += 4 * (
                left["y"]
                + 1
                - (
                    left["h"]
                    + 2 * left["x"]
                    - right["h"]
                    - 1
                )
                ** 2
                + (
                    left["h"]
                    + left["x"]
                    - right["h"]
                )
                ** 2
            )

    psi = 0
    for left in a_rows:
        for right in p_rows:
            psi += 2 * (
                2 * (rank_q - 3)
                + left["c"]
                + 2 * left["y"]
                + right["c"]
                - (left["h"] + 2 * left["x"] - right["h"])
                ** 2
            )

    chi = 0
    for left in m_rows:
        for right in p_rows:
            chi += 2 * (
                2 * (rank_q - 3)
                + left["c"]
                + right["c"]
                + 1
                - (left["h"] + 1 - right["h"]) ** 2
            )

    mass = 8 * len(m_rows) ** 2
    return {
        "root": root_block,
        "phi": phi,
        "psi": psi,
        "chi": chi,
        "mass": mass,
    }


def recursive_blocks(
    base: nx.Graph,
    root: int,
    support: int,
    rank_q: int,
) -> dict[str, int]:
    lower = base.subgraph(set(base) - {support}).copy()
    j_graph = base.subgraph(set(base) - {root}).copy()
    k_graph = base.subgraph(set(base) - {root, support}).copy()

    a0 = phase_rows(base, rank_q, root, support)
    a1 = phase_rows(lower, rank_q - 1, root)
    m0 = phase_rows(j_graph, rank_q - 1, None, support)
    m1 = phase_rows(k_graph, rank_q - 2, None)
    p0 = phase_rows(j_graph, rank_q - 2, None, support)
    p1 = phase_rows(k_graph, rank_q - 3, None)

    old = doubled_core_blocks(rank_q, a0, m0, p0)
    lower_blocks = doubled_core_blocks(
        rank_q - 1, a1, m1, p1
    )
    new = doubled_core_blocks(
        rank_q,
        updated(a0) + a1,
        updated(m0) + m1,
        updated(p0) + p1,
    )
    return {
        name: new[name] - old[name] - lower_blocks[name]
        for name in old
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=8)
    parser.add_argument("--atlas-forest-order", type=int, default=7)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_theta_core_recursive_phase_blocks_"
            "20260729.json"
        ),
    )
    args = parser.parse_args()

    groupings = {
        "root": ("root",),
        "phi": ("phi",),
        "psi": ("psi",),
        "chi": ("chi",),
        "mass": ("mass",),
        "root_plus_phi": ("root", "phi"),
        "psi_plus_chi": ("psi", "chi"),
        "psi_plus_chi_plus_mass": ("psi", "chi", "mass"),
        "root_phi_mass": ("root", "phi", "mass"),
        "phi_psi": ("phi", "psi"),
        "all": ("root", "phi", "psi", "chi", "mass"),
    }
    minima: dict[str, tuple[int, dict] | None] = {
        name: None for name in groupings
    }
    negative_counts = {name: 0 for name in groupings}
    checks = 0
    checked_graphs = 0

    def audit_graph(
        base: nx.Graph,
        family: str,
    ) -> None:
        nonlocal checks, checked_graphs
        order = len(base)
        code = nx.to_graph6_bytes(
            base, header=False
        ).decode("ascii").strip()
        for root in base:
            for support in base:
                if support == root:
                    continue
                for rank_q in range(4, order + 4):
                    blocks = recursive_blocks(
                        base, root, support, rank_q
                    )
                    for name, parts in groupings.items():
                        value = sum(
                            blocks[part] for part in parts
                        )
                        record = {
                            "family": family,
                            "order": order,
                            "graph6": code,
                            "root": root,
                            "support": support,
                            "rank_q": rank_q,
                            "value": value,
                            "blocks": blocks,
                        }
                        if value < 0:
                            negative_counts[name] += 1
                        if (
                            minima[name] is None
                            or value < minima[name][0]
                        ):
                            minima[name] = (value, record)
                    checks += 1
        checked_graphs += 1

    for order in range(3, args.maximum_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            base = nx.convert_node_labels_to_integers(tree0)
            audit_graph(base, "unlabeled_tree")

    for forest0 in nx.graph_atlas_g():
        order = len(forest0)
        if (
            order < 2
            or order > args.atlas_forest_order
            or not nx.is_forest(forest0)
            or nx.is_tree(forest0)
        ):
            continue
        audit_graph(
            nx.convert_node_labels_to_integers(forest0),
            "atlas_disconnected_forest",
        )

    report = {
        "status": (
            "PASS_TOTAL_RECURSIVE_PHASE_BLOCK"
            if negative_counts["all"] == 0
            else "FAIL_TOTAL_RECURSIVE_PHASE_BLOCK"
        ),
        "maximum_unlabeled_tree_order": args.maximum_order,
        "atlas_disconnected_forest_order": args.atlas_forest_order,
        "checked_graphs": checked_graphs,
        "checked_root_support_rank_instances": checks,
        "negative_grouping_counts": negative_counts,
        "minimum_groupings": {
            name: item[1] if item is not None else None
            for name, item in minima.items()
        },
        "warning": (
            "This is exact finite evidence used to discover a proof "
            "grouping; only the five-block identity is algebraic."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
