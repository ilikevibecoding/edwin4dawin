#!/usr/bin/env python3
"""Probe the complete protected-leaf recursion system for phase gaps.

Let T_q(B;v,s) denote either grouped phase block (or their total).
Besides pruning an unrelated leaf, there are three collision cases:

* add a leaf at v, then delete v and shift the root one step toward s;
* add a leaf at s, then delete s and shift the support toward v;
* add an isolate, whose selected phase leaves B itself.

The strong tests subtract the corresponding rank-(q-1) phase gap.
At q=4 the lower rank is the separate rank-three boundary, so only
plain nondecrease is recorded.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import networkx as nx

from probe_second_leaf_recursion_for_phase_blocks import grouped
from scan_edge_survival_ratio_dominance import random_forest


BLOCKS = ("shadow_phi", "component_square", "total")
CASES = ("root_shift", "support_shift", "isolate")


def main() -> None:
    checks = 0
    configurations = 0
    failures: list[dict] = []
    minima: dict[str, dict[str, tuple[int, dict] | None]] = {
        case: {block: None for block in BLOCKS} for case in CASES
    }

    def audit(
        graph: nx.Graph,
        root: int,
        support: int,
        family: str,
        identifier: str,
        maximum_rank: int,
    ) -> None:
        nonlocal checks, configurations
        path = nx.shortest_path(graph, root, support)
        if len(path) < 3:
            return
        configurations += 1
        next_vertex = max(graph.nodes, default=-1) + 1
        old_by_rank = {
            q: grouped(graph, root, support, q)
            for q in range(3, maximum_rank + 1)
        }
        cases: dict[
            str, tuple[nx.Graph, nx.Graph, int, int]
        ] = {}

        root_large = graph.copy()
        root_large.add_edge(root, next_vertex)
        root_lower = graph.subgraph(set(graph) - {root}).copy()
        cases["root_shift"] = (
            root_large,
            root_lower,
            path[1],
            support,
        )

        support_large = graph.copy()
        support_large.add_edge(support, next_vertex)
        support_lower = graph.subgraph(
            set(graph) - {support}
        ).copy()
        cases["support_shift"] = (
            support_large,
            support_lower,
            root,
            path[-2],
        )

        isolate_large = graph.copy()
        isolate_large.add_node(next_vertex)
        cases["isolate"] = (
            isolate_large,
            graph,
            root,
            support,
        )

        for case, (larger, lower, lower_root, lower_support) in (
            cases.items()
        ):
            for q in range(4, maximum_rank + 1):
                large_values = grouped(larger, root, support, q)
                old_values = old_by_rank[q]
                lower_values = (
                    grouped(
                        lower,
                        lower_root,
                        lower_support,
                        q - 1,
                    )
                    if q >= 5
                    else {block: 0 for block in BLOCKS}
                )
                for block in BLOCKS:
                    margin = (
                        large_values[block]
                        - old_values[block]
                        - lower_values[block]
                    )
                    record = {
                        "family": family,
                        "identifier": identifier,
                        "order": len(graph),
                        "root": root,
                        "support": support,
                        "rank_q": q,
                        "case": case,
                        "block": block,
                        "strong_lower_subtracted": q >= 5,
                        "margin": margin,
                    }
                    checks += 1
                    current = minima[case][block]
                    if current is None or margin < current[0]:
                        minima[case][block] = (margin, record)
                    if margin < 0:
                        failures.append(record)

    tree_count = 0
    for order in range(3, 9):
        for tree0 in nx.nonisomorphic_trees(order):
            tree_count += 1
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                for support in tree:
                    if (
                        support != root
                        and nx.shortest_path_length(
                            tree, root, support
                        )
                        >= 2
                    ):
                        audit(
                            tree,
                            root,
                            support,
                            "tree",
                            code,
                            order + 4,
                        )

    rng = random.Random(993_885)
    random_count = 0
    for sample in range(80):
        forest = random_forest(rng, 10, 90)
        pairs = [
            (root, support)
            for root in forest
            for support in nx.node_connected_component(forest, root)
            if support != root
            and nx.shortest_path_length(forest, root, support) >= 2
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
            12,
        )

    report = {
        "failure_counts_by_case_and_block": {
            case: {
                block: sum(
                    item["case"] == case and item["block"] == block
                    for item in failures
                )
                for block in BLOCKS
            }
            for case in CASES
        },
        "status": (
            "PASS_COMBINED_SHIFTED_ENDPOINT_PHASE_RECURSION_PROBE"
            if not any(
                item["block"] == "total" for item in failures
            )
            else "FAIL_COMBINED_SHIFTED_ENDPOINT_PHASE_RECURSION_PROBE"
        ),
        "tree_orders": "3..8",
        "tree_count": tree_count,
        "random_forest_count": random_count,
        "root_support_configurations": configurations,
        "checked_block_margins": checks,
        "strong_ranks": "q>=5",
        "rank_four": "plain nondecrease, no formal rank-three term",
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
            "The combined block is the asserted recurrence. The "
            "shadow-only root-shift strengthening has negative "
            "controls and is not asserted. This remains exact finite "
            "evidence, not a proof of the original conjecture."
        ),
    }
    Path(
        "shifted_endpoint_phase_recursion_probe_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
