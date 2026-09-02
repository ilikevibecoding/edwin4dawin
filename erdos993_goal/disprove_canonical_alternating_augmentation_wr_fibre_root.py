#!/usr/bin/env python3
"""Exact counterexample to a canonical-augmentation fibre proof of WR.

This does not disprove the weak coefficient ratio.  It disproves only the
attempt to prove it by mapping each rank-(r-1) independent set to the first
canonical alternating augmentation toward a fixed maximum independent set
and bounding every rank-r fibre by r.
"""

from __future__ import annotations

import itertools
import json
from collections import Counter
from pathlib import Path

import networkx as nx

from probe_canonical_alternating_augmentation import (
    canonical_augment,
    canonical_augmentations,
)
from probe_weak_prefix_ratio_forests_root import forest_polynomial


def witness_tree() -> tuple[nx.Graph, frozenset[int], frozenset[int]]:
    # Seven matched units (a_i,c_i), with the a_0--c_i outward star, plus
    # five unmatched A-vertices joined to c_0.  The displayed A is a maximum
    # independent set of size 12.
    m = 7
    a = list(range(m))
    c = list(range(m, 2 * m))
    extras = list(range(2 * m, 2 * m + 5))
    graph = nx.Graph()
    graph.add_nodes_from(a + c + extras)
    graph.add_edges_from((a[i], c[i]) for i in range(m))
    graph.add_edges_from((a[0], c[i]) for i in range(1, m))
    graph.add_edges_from((u, c[0]) for u in extras)
    maximum = frozenset(a + extras)
    target = frozenset(a)
    return graph, maximum, target


def main() -> None:
    graph, maximum, target = witness_tree()
    poly = forest_polynomial(graph)
    alpha = len(poly) - 1
    target_rank = len(target)
    domain_rank = target_rank - 1
    tail_start = (2 * alpha + 1) // 3  # ceil((2 alpha - 1)/3)

    assert nx.is_tree(graph)
    assert len(graph) == 19 and graph.number_of_edges() == 18
    assert len(maximum) == alpha == 12
    assert all(not (u in maximum and v in maximum) for u, v in graph.edges())
    assert nx.algorithms.matching.max_weight_matching(
        graph, maxcardinality=True
    ).__len__() == len(graph) - alpha == 7
    assert target_rank == 7 < tail_start == 8

    fibres: Counter[frozenset[int]] = Counter()
    all_root_fibres: Counter[frozenset[int]] = Counter()
    preimages: list[list[int]] = []
    for comb in itertools.combinations(sorted(graph), domain_rank):
        source = frozenset(comb)
        if any(u in source and v in source for u, v in graph.edges()):
            continue
        image = canonical_augment(graph, maximum, source)
        fibres[image] += 1
        for all_root_image in canonical_augmentations(graph, maximum, source):
            all_root_fibres[all_root_image] += 1
        if image == target:
            preimages.append(sorted(source))

    fibre = fibres[target]
    coefficient_margin = target_rank * poly[target_rank] - poly[domain_rank]
    report = {
        "status": "FAIL_EXACT_CANONICAL_ALTERNATING_AUGMENTATION_WR_FIBRE_BOUND",
        "scope": (
            "route counterexample only; the weak coefficient ratio and Erdos 993 "
            "are not disproved"
        ),
        "order": len(graph),
        "edges": sorted([sorted(edge) for edge in graph.edges()]),
        "alpha": alpha,
        "tail_start": tail_start,
        "domain_rank": domain_rank,
        "target_rank": target_rank,
        "maximum_independent_set": sorted(maximum),
        "target": sorted(target),
        "target_fibre": fibre,
        "claimed_fibre_bound": target_rank,
        "all_root_double_count_bound": target_rank * (alpha - domain_rank),
        "all_root_target_fibre": all_root_fibres[target],
        "independence_polynomial": poly,
        "weak_ratio_margin": coefficient_margin,
        "preimages": preimages,
    }
    assert fibre == 70
    assert fibre > target_rank
    assert report["all_root_target_fibre"] > report["all_root_double_count_bound"]
    assert coefficient_margin >= 0
    Path(
        "canonical_alternating_augmentation_wr_fibre_obstruction_exact_root_20260829.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
