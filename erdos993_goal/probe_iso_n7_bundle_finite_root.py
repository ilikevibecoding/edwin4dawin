#!/usr/bin/env python3
"""Finite exact frontier probe for the rank-seven bundle telescope.

Evaluate g1,...,g12 on every canonical deepest-support cell in atlas
forests through order seven.  This is finite diagnostic evidence only.
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
OUTPUT = HERE / "iso_n7_bundle_finite_probe_root_20260830.json"


def direct_coefficients(
    base: nx.Graph, support: int, u: int, v: int
) -> list[int]:
    c_graph = base.copy()
    c_graph.remove_node(support)
    base_value = rank_value(base, u, v, 7)
    gamma = []
    for bundle_size in range(13):
        bundled = add_leaves(base, support, bundle_size)
        payment = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 6)
            for isolates in range(bundle_size)
        )
        gamma.append(rank_value(bundled, u, v, 7) - base_value - payment)
    coefficients = binomial_coefficients(gamma)
    assert len(coefficients) == 13 and coefficients[0] == 0
    return coefficients


def make_witness(
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
    minima = {index: None for index in range(1, 13)}
    mode_minima = {
        mode: {index: None for index in range(1, 13)} for mode in MODES
    }
    negatives = []
    terminal_minimum = None
    marked_cells = bundle_cells = 0

    for graph, u, v, expected_mode in cases:
        marked_cells += 1
        cell = deepest_eligible_support(graph, u, v)
        if cell is None:
            assert expected_mode is None
            terminal = classify_terminal(graph, u, v)
            terminal_counts[terminal] += 1
            value = rank_value(graph, u, v, 7)
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
        coefficients = direct_coefficients(base, cell["support"], u, v)

        for index in range(1, 13):
            value = coefficients[index]
            item = make_witness(graph, u, v, cell, mode, index, value)
            if minima[index] is None or value < minima[index]["value"]:
                minima[index] = item
            if (
                mode_minima[mode][index] is None
                or value < mode_minima[mode][index]["value"]
            ):
                mode_minima[mode][index] = item
            if value < 0:
                negatives.append(item)

        actual_bundle = len(cell["bundle"])
        c_graph = base.copy()
        c_graph.remove_node(cell["support"])
        payment = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 6)
            for isolates in range(actual_bundle)
        )
        gamma = (
            rank_value(graph, u, v, 7)
            - rank_value(base, u, v, 7)
            - payment
        )
        reconstructed = sum(
            coefficients[index] * comb(actual_bundle, index)
            for index in range(1, 13)
        )
        assert gamma == reconstructed

    assert set(mode_counts) == set(MODES)
    assert set(terminal_counts) == {
        "connected_double_broom_plus_isolates",
        "disconnected_rooted_stars_plus_isolates",
    }
    report = {
        "marker": "PROBE_EXACT_ISO_N7_BUNDLE_FINITE_ROOT",
        "rank": 7,
        "atlas_orders": [2, maximum_order],
        "marked_cells_including_fixtures": marked_cells,
        "bundle_cells": bundle_cells,
        "mode_counts": dict(sorted(mode_counts.items())),
        "terminal_counts": dict(sorted(terminal_counts.items())),
        "terminal_minimum": terminal_minimum,
        "global_minima": {
            f"g{index}": minima[index] for index in range(1, 13)
        },
        "mode_minima": {
            mode: {
                f"g{index}": mode_minima[mode][index]
                for index in range(1, 13)
            }
            for mode in sorted(MODES)
        },
        "negative_count": len(negatives),
        "negative_witnesses": negatives[:100],
        "scope": (
            "Finite exact atlas/fixture probe only. Zero negatives would not prove "
            "universal rank-seven bundle coefficients, all-N7, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "marked_cells": marked_cells,
                "bundle_cells": bundle_cells,
                "negative_count": report["negative_count"],
                "global_minima": {
                    key: value["value"]
                    for key, value in report["global_minima"].items()
                },
                "terminal_minimum": terminal_minimum,
                "source_sha256": report["source_sha256"],
                "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
            },
            indent=2,
            sort_keys=True,
        )
    )
    print(report["marker"])


if __name__ == "__main__":
    main()
