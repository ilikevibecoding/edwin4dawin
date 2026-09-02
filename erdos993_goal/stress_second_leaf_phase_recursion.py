#!/usr/bin/env python3
"""Large exact stress test of the second leaf phase recursion."""

from __future__ import annotations

import json
import random
from pathlib import Path

import networkx as nx

from scan_edge_survival_ratio_dominance import random_forest
from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


def grouped(
    graph: nx.Graph, root: int, support: int, q: int
) -> dict[str, int]:
    blocks = recursive_blocks_fast(graph, root, support, q)
    return {
        "shadow_phi": (
            blocks["root"] + blocks["phi"] + blocks["mass"]
        ),
        "component_square": blocks["psi"] + blocks["chi"],
        "total": sum(blocks.values()),
    }


def main() -> None:
    rng = random.Random(993818)
    samples = 120
    maximum_order = 100
    maximum_rank = 12
    checks = 0
    sampled_configurations = 0
    failures: list[dict] = []
    minima: dict[str, tuple[int, dict] | None] = {
        "shadow_phi": None,
        "component_square": None,
        "total": None,
    }
    family_counts: dict[str, int] = {}
    for sample in range(samples):
        forest = random_forest(rng, 5, maximum_order)
        nontrivial_vertices = [
            vertex for vertex in forest if forest.degree(vertex) > 0
        ]
        if not nontrivial_vertices:
            continue
        root = rng.choice(nontrivial_vertices)
        component = nx.node_connected_component(forest, root)
        distances = nx.single_source_shortest_path_length(forest, root)
        maximum = max(distances.values())
        supports = [
            vertex
            for vertex in component
            if forest.degree(vertex) == 1
            and vertex != root
            and distances[vertex] == maximum
        ]
        if not supports:
            continue
        support = rng.choice(supports)
        candidates = []
        for leaf in forest:
            if (
                forest.degree(leaf) != 1
                or leaf in {root, support}
            ):
                continue
            parent = next(iter(forest[leaf]))
            if parent in {root, support}:
                continue
            candidates.append(leaf)
        if not candidates:
            continue
        second_leaf = rng.choice(candidates)
        second_support = next(iter(forest[second_leaf]))
        family = (
            "external_component"
            if second_leaf not in component
            else "root_component"
        )
        family_counts[family] = family_counts.get(family, 0) + 1
        smaller = forest.subgraph(
            set(forest) - {second_leaf}
        ).copy()
        lower = forest.subgraph(
            set(forest) - {second_leaf, second_support}
        ).copy()
        sampled_configurations += 1
        for q in range(4, maximum_rank + 1):
            large = grouped(forest, root, support, q)
            small = grouped(smaller, root, support, q)
            down = grouped(lower, root, support, q - 1)
            for name in large:
                value = large[name] - small[name] - down[name]
                record = {
                    "sample": sample,
                    "forest_order": len(forest),
                    "family": family,
                    "root": root,
                    "first_support": support,
                    "second_leaf": second_leaf,
                    "second_support": second_support,
                    "rank_q": q,
                    "block": name,
                    "second_recursive_margin": value,
                }
                checks += 1
                if (
                    minima[name] is None
                    or value < minima[name][0]
                ):
                    minima[name] = (value, record)
                if value < 0:
                    failures.append(record)
    report = {
        "status": (
            "PASS_SECOND_LEAF_PHASE_RECURSION_STRESS"
            if not failures
            else "FAIL_SECOND_LEAF_PHASE_RECURSION_STRESS"
        ),
        "random_seed": 993818,
        "requested_samples": samples,
        "maximum_forest_order": maximum_order,
        "maximum_rank": maximum_rank,
        "sampled_configurations": sampled_configurations,
        "family_counts": family_counts,
        "checked_block_margins": checks,
        "failure_count": len(failures),
        "first_failures": failures[:30],
        "minima": {
            name: item[1] if item is not None else None
            for name, item in minima.items()
        },
        "warning": (
            "This is exact randomized evidence for an auxiliary "
            "double recursion, not a proof."
        ),
    }
    Path(
        "second_leaf_phase_recursion_stress_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
