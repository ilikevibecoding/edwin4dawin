#!/usr/bin/env python3
"""Exact finite census of the rank-five whole-bundle coefficient g4.

This is discovery evidence for the first coefficient below the proved g5-g8
block.  It evaluates the defining Gamma polynomial directly from independence
rows, without importing the 103-term invariant reduction.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import graph6, poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g4_forest_census_probe_root_20260829.json"


def at(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def nested(rows: tuple[list[int], list[int], list[int], list[int]], rank: int) -> int:
    e, u, v, w = rows
    r = rank
    return (
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def isolate_multiply(row: list[int], count: int, maximum: int) -> list[int]:
    from math import comb

    return [
        sum(comb(count, index) * at(row, rank - index) for index in range(rank + 1))
        for rank in range(maximum + 1)
    ]


def tuple_isolate_multiply(rows, count: int, maximum: int):
    return tuple(isolate_multiply(row, count, maximum) for row in rows)


def add_xd(crows, drows, maximum: int):
    return tuple(
        [at(crow, rank) + at(drow, rank - 1) for rank in range(maximum + 1)]
        for crow, drow in zip(crows, drows)
    )


def rows_after_deleting(graph: nx.Graph, u: int, v: int, deleted: set[int]):
    rows = []
    for extra in (set(), {u}, {v}, {u, v}):
        child = graph.copy()
        child.remove_nodes_from(deleted | extra)
        rows.append(poly_forest(child))
    return tuple(rows)


def configuration_rows(graph: nx.Graph, u: int, v: int, support: int):
    closed = {support} | set(graph.neighbors(support))
    return (
        rows_after_deleting(graph, u, v, {support}),
        rows_after_deleting(graph, u, v, closed),
    )


def gamma_values(crows, drows) -> list[int]:
    base = nested(add_xd(crows, drows, 6), 5)
    values = []
    for bundle in range(5):
        tm = add_xd(tuple_isolate_multiply(crows, bundle, 6), drows, 6)
        lower = sum(
            nested(tuple_isolate_multiply(crows, isolates, 5), 4)
            for isolates in range(bundle)
        )
        values.append(nested(tm, 5) - base - lower)
    return values


def forward_coefficients(values: list[int]) -> list[int]:
    rows = [values]
    while len(rows[-1]) > 1:
        previous = rows[-1]
        rows.append([previous[index + 1] - previous[index] for index in range(len(previous) - 1)])
    return [row[0] for row in rows]


def main() -> None:
    checks = negative_g4 = 0
    minima = {index: None for index in range(1, 5)}
    minimum_records = {}
    forest_types = 0

    for graph0 in nx.graph_atlas_g():
        if len(graph0) < 3 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        forest_types += 1
        for support in graph:
            for u in graph:
                if u == support:
                    continue
                for v in graph:
                    if v in (support, u):
                        continue
                    crows, drows = configuration_rows(graph, u, v, support)
                    gamma = gamma_values(crows, drows)
                    coefficients = forward_coefficients(gamma)
                    assert coefficients[0] == 0
                    checks += 1
                    if coefficients[4] < 0:
                        negative_g4 += 1
                    for index in range(1, 5):
                        value = coefficients[index]
                        if minima[index] is None or value < minima[index]:
                            minima[index] = value
                            minimum_records[str(index)] = {
                                "value": value,
                                "order": len(graph),
                                "graph6": graph6(graph),
                                "support": support,
                                "marks": [u, v],
                                "gamma_0_to_4": gamma,
                                "g1_to_g4": coefficients[1:5],
                            }

    assert negative_g4 == 0
    report = {
        "marker": "PROBE_EXACT_ISO_N5_BUNDLE_G4_FOREST_CENSUS_ROOT",
        "scope": "Every forest in the graph atlas through order seven, every support, and every ordered pair of distinct marks.",
        "forest_types": forest_types,
        "configuration_cells": checks,
        "negative_g4_cells": negative_g4,
        "minima_g1_to_g4": {str(index): minima[index] for index in range(1, 5)},
        "minimum_records": minimum_records,
        "method": (
            "Direct exact Gamma_0,...,Gamma_4 evaluation from C=I(H-s), D=I(H-N[s]) "
            "and Newton forward differences; the 103-term invariant is not imported."
        ),
        "status_guard": "Finite evidence only; no all-order g4 sign theorem or rank-five payment lemma is asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
