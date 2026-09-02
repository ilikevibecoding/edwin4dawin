#!/usr/bin/env python3
"""Probe plain protected-leaf monotonicity at the actual rank three.

At q=3 there is no formal rank-two theta-core term.  The quantity
tested here is the actual increment d_3(B+z_s)-d_3(B), represented by
the five phase blocks before subtracting a lower-rank block.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import networkx as nx

from scan_edge_survival_ratio_dominance import random_forest
from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


BLOCKS = ("shadow_phi", "component_square", "total")
CASES = ("ordinary_leaf", "root_leaf", "support_leaf", "isolate")


def rank3_blocks(
    graph: nx.Graph, root: int, support: int
) -> dict[str, int]:
    raw = recursive_blocks_fast(
        graph,
        root,
        support,
        3,
        subtract_lower=False,
    )
    return {
        "shadow_phi": raw["root"] + raw["phi"] + raw["mass"],
        "component_square": raw["psi"] + raw["chi"],
        "total": sum(raw.values()),
    }


def main() -> None:
    checks = 0
    configurations = 0
    failures: list[dict] = []
    minima: dict[str, dict[str, tuple[int, dict] | None]] = {
        case: {block: None for block in BLOCKS} for case in CASES
    }

    def record_margin(
        case: str,
        block: str,
        margin: int,
        graph: nx.Graph,
        root: int,
        support: int,
        family: str,
        identifier: str,
    ) -> None:
        nonlocal checks
        record = {
            "family": family,
            "identifier": identifier,
            "order": len(graph),
            "root": root,
            "support": support,
            "case": case,
            "block": block,
            "margin": margin,
        }
        checks += 1
        current = minima[case][block]
        if current is None or margin < current[0]:
            minima[case][block] = (margin, record)
        if margin < 0:
            failures.append(record)

    def audit(
        graph: nx.Graph,
        root: int,
        support: int,
        family: str,
        identifier: str,
    ) -> None:
        nonlocal configurations
        configurations += 1
        old = rank3_blocks(graph, root, support)
        next_vertex = max(graph.nodes, default=-1) + 1

        additions = {}
        root_large = graph.copy()
        root_large.add_edge(root, next_vertex)
        additions["root_leaf"] = root_large
        support_large = graph.copy()
        support_large.add_edge(support, next_vertex)
        additions["support_leaf"] = support_large
        isolate_large = graph.copy()
        isolate_large.add_node(next_vertex)
        additions["isolate"] = isolate_large
        for case, larger in additions.items():
            large = rank3_blocks(larger, root, support)
            for block in BLOCKS:
                record_margin(
                    case,
                    block,
                    large[block] - old[block],
                    graph,
                    root,
                    support,
                    family,
                    identifier,
                )

        for leaf in graph:
            if (
                leaf in {root, support}
                or graph.degree(leaf) != 1
            ):
                continue
            parent = next(iter(graph[leaf]))
            if parent in {root, support}:
                continue
            smaller = graph.subgraph(set(graph) - {leaf}).copy()
            small = rank3_blocks(smaller, root, support)
            for block in BLOCKS:
                record_margin(
                    "ordinary_leaf",
                    block,
                    old[block] - small[block],
                    graph,
                    root,
                    support,
                    family,
                    identifier,
                )

    tree_count = 0
    for order in range(2, 9):
        for tree0 in nx.nonisomorphic_trees(order):
            tree_count += 1
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                for support in tree:
                    if support != root:
                        audit(
                            tree,
                            root,
                            support,
                            "tree",
                            code,
                        )

    atlas_count = 0
    for forest0 in nx.graph_atlas_g():
        order = len(forest0)
        if order < 2 or order > 7 or not nx.is_forest(forest0):
            continue
        atlas_count += 1
        forest = nx.convert_node_labels_to_integers(forest0)
        code = nx.to_graph6_bytes(
            forest, header=False
        ).decode("ascii").strip()
        for root in forest:
            component = nx.node_connected_component(forest, root)
            for support in component:
                if support != root:
                    audit(
                        forest,
                        root,
                        support,
                        "atlas_forest",
                        code,
                    )

    rng = random.Random(993_887)
    random_count = 0
    for sample in range(80):
        forest = random_forest(rng, 10, 90)
        pairs = [
            (root, support)
            for root in forest
            for support in nx.node_connected_component(forest, root)
            if support != root
        ]
        if not pairs:
            continue
        root, support = rng.choice(pairs)
        random_count += 1
        audit(
            forest,
            root,
            support,
            "random_forest",
            str(sample),
        )

    counts = {
        case: {
            block: sum(
                item["case"] == case and item["block"] == block
                for item in failures
            )
            for block in BLOCKS
        }
        for case in CASES
    }
    report = {
        "status": (
            "PASS_RANK3_COMBINED_PROTECTED_LEAF_MONOTONICITY_PROBE"
            if not any(item["block"] == "total" for item in failures)
            else "FAIL_RANK3_COMBINED_PROTECTED_LEAF_MONOTONICITY_PROBE"
        ),
        "tree_orders": "2..8",
        "tree_count": tree_count,
        "atlas_forest_orders": "2..7",
        "atlas_forest_count": atlas_count,
        "random_forest_count": random_count,
        "root_support_configurations": configurations,
        "checked_block_margins": checks,
        "failure_counts_by_case_and_block": counts,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "minima": {
            case: {
                block: item[1] if item is not None else None
                for block, item in block_minima.items()
            }
            for case, block_minima in minima.items()
        },
        "warning": (
            "The combined rank-three quantity is the asserted "
            "monotonicity. This is exact finite evidence, not a proof."
        ),
    }
    Path(
        "rank3_protected_leaf_monotonicity_probe_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
