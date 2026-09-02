#!/usr/bin/env python3
"""Finite exact frontier probe for the rank-six bundle telescope.

This independently evaluates the ten binomial coefficients g1,...,g10 on
every canonical deepest-support cell in atlas forests through order seven.
It is diagnostic only; universal signs require all-order certificates.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from math import comb
from pathlib import Path

import networkx as nx

from assemble_iso_all_forest_n4_bundle_induction_root import (
    MODES,
    add_isolates,
    add_leaves,
    binomial_coefficients,
    classify_deepest_support,
    classify_terminal,
    deepest_eligible_support,
    fixture_cells,
    rank_value,
)
from probe_iso_leaf_cross_remainder_root import graph6


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_finite_probe_root_20260830.json"


def direct_bundle_coefficients(
    base: nx.Graph, support: int, u: int, v: int
) -> tuple[list[int], list[int]]:
    assert support not in (u, v)
    c_graph = base.copy()
    c_graph.remove_node(support)
    base_n6 = rank_value(base, u, v, 6)
    gamma = []
    for bundle_size in range(11):
        bundled = add_leaves(base, support, bundle_size)
        lower_payment = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 5)
            for isolates in range(bundle_size)
        )
        gamma.append(rank_value(bundled, u, v, 6) - base_n6 - lower_payment)
    coefficients = binomial_coefficients(gamma)
    assert len(coefficients) == 11 and coefficients[0] == 0
    return coefficients, gamma


def witness(
    graph: nx.Graph,
    u: int,
    v: int,
    cell: dict,
    mode: str,
    index: int,
    value: int,
) -> dict:
    return {
        "value": value,
        "order": len(graph),
        "mode": mode,
        "binomial_rank": index,
        "u": int(u),
        "v": int(v),
        "support": int(cell["support"]),
        "bundle_size": len(cell["bundle"]),
        "graph6": graph6(nx.convert_node_labels_to_integers(graph)),
    }


def main() -> None:
    maximum_order = 7
    cases = []
    for graph0 in nx.graph_atlas_g():
        if 2 <= len(graph0) <= maximum_order and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            cases.extend((graph, u, v, None) for u in graph for v in graph if u < v)
    cases.extend(fixture_cells())

    mode_counts = Counter()
    terminal_counts = Counter()
    mode_minima = {
        mode: {index: None for index in range(1, 11)} for mode in MODES
    }
    global_minima = {index: None for index in range(1, 11)}
    negative_witnesses = []
    terminal_minimum = None
    marked_cells = bundle_cells = 0

    for graph, u, v, expected_mode in cases:
        marked_cells += 1
        cell = deepest_eligible_support(graph, u, v)
        if cell is None:
            assert expected_mode is None
            terminal = classify_terminal(graph, u, v)
            terminal_counts[terminal] += 1
            value = rank_value(graph, u, v, 6)
            if terminal_minimum is None or value < terminal_minimum["value"]:
                terminal_minimum = {
                    "value": value,
                    "order": len(graph),
                    "terminal_class": terminal,
                    "u": int(u),
                    "v": int(v),
                    "graph6": graph6(nx.convert_node_labels_to_integers(graph)),
                }
            continue

        classification = classify_deepest_support(graph, u, v, cell)
        mode = classification["mode"]
        if expected_mode is not None:
            assert mode == expected_mode
        mode_counts[mode] += 1
        bundle_cells += 1

        base = graph.copy()
        base.remove_nodes_from(cell["bundle"])
        coefficients, _ = direct_bundle_coefficients(
            base, cell["support"], u, v
        )
        for index in range(1, 11):
            value = coefficients[index]
            current = mode_minima[mode][index]
            if current is None or value < current["value"]:
                mode_minima[mode][index] = witness(
                    graph, u, v, cell, mode, index, value
                )
            global_current = global_minima[index]
            if global_current is None or value < global_current["value"]:
                global_minima[index] = witness(
                    graph, u, v, cell, mode, index, value
                )
            if value < 0:
                negative_witnesses.append(
                    witness(graph, u, v, cell, mode, index, value)
                )

        actual_bundle = len(cell["bundle"])
        c_graph = base.copy()
        c_graph.remove_node(cell["support"])
        lower = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 5)
            for isolates in range(actual_bundle)
        )
        actual_gamma = (
            rank_value(graph, u, v, 6)
            - rank_value(base, u, v, 6)
            - lower
        )
        reconstructed = sum(
            coefficients[index] * comb(actual_bundle, index)
            for index in range(1, 11)
        )
        assert actual_gamma == reconstructed

    assert set(mode_counts) == set(MODES)
    assert set(terminal_counts) == {
        "connected_double_broom_plus_isolates",
        "disconnected_rooted_stars_plus_isolates",
    }
    report = {
        "marker": "PROBE_EXACT_ISO_N6_BUNDLE_FINITE_ROOT",
        "rank": 6,
        "atlas_orders": [2, maximum_order],
        "marked_cells_including_fixtures": marked_cells,
        "bundle_cells": bundle_cells,
        "mode_counts": dict(sorted(mode_counts.items())),
        "terminal_counts": dict(sorted(terminal_counts.items())),
        "terminal_minimum": terminal_minimum,
        "global_minima": {
            f"g{index}": global_minima[index] for index in range(1, 11)
        },
        "mode_minima": {
            mode: {
                f"g{index}": mode_minima[mode][index]
                for index in range(1, 11)
            }
            for mode in sorted(MODES)
        },
        "negative_count": len(negative_witnesses),
        "negative_witnesses": negative_witnesses[:100],
        "scope": (
            "Finite exact atlas/fixture probe only. Zero negatives would not prove "
            "universal rank-six bundle coefficients, all-N6, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    summary = {
        "marker": report["marker"],
        "marked_cells": marked_cells,
        "bundle_cells": bundle_cells,
        "negative_count": report["negative_count"],
        "global_minima": {
            key: value["value"] for key, value in report["global_minima"].items()
        },
        "terminal_minimum": terminal_minimum,
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
