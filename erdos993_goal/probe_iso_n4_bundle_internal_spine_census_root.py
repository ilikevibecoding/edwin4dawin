#!/usr/bin/env python3
"""Exact finite census for the missing rank-four internal-spine bundle mode.

The child side of a deepest two-neighbour support is a bare path ending at
one protected mark.  This probe exhausts every forest F in the graph atlas,
every parent/other-mark placement in one component, and path lengths 1..L.
It computes g1 and g2 from the defining Gamma finite differences using only
exact integer coefficient rows.  Finite evidence is not promoted to a proof.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import graph6, poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_internal_spine_census_probe_root_20260829.json"


def at(row, k):
    return row[k] if 0 <= k < len(row) else 0


def convolution(left, right, maximum=5):
    return tuple(
        sum(at(left, j) * at(right, k - j) for j in range(k + 1))
        for k in range(maximum + 1)
    )


def path_row(order, maximum=5):
    return tuple(comb(order - k + 1, k) if 0 <= k <= (order + 1) // 2 else 0 for k in range(maximum + 1))


def nminor(rows, rank):
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


def isolate_multiply(rows, number, maximum):
    return tuple(
        tuple(
            sum(comb(number, i) * at(row, k - i) for i in range(min(number, k) + 1))
            for k in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(rows, drows):
    return tuple(
        tuple(at(row, k) + at(drow, k - 1) for k in range(len(row)))
        for row, drow in zip(rows, drows)
    )


def gamma(crows, drows, number):
    tm = add_xd(isolate_multiply(crows, number, 5), drows)
    t0 = add_xd(crows, drows)
    lower = sum(nminor(isolate_multiply(crows, t, 4), 3) for t in range(number))
    return nminor(tm, 4) - nminor(t0, 4) - lower


def deleted_row(graph, removed):
    reduced = graph.copy()
    reduced.remove_nodes_from(removed)
    row = tuple(poly_forest(reduced))
    return row + (0,) * (6 - len(row))


def rows_for_cell(forest, v, p, ell):
    r0 = deleted_row(forest, ())
    rv = deleted_row(forest, (v,))
    rp = deleted_row(forest, (p,))
    rvp = deleted_row(forest, (v, p))
    x, y, z = path_row(ell), path_row(ell - 1), path_row(max(ell - 2, 0))
    # For ell=1, deleting the sole path vertex u and deleting the attachment
    # endpoint are the same operation; the double-deletion row is empty (=1).
    if ell == 1:
        z = path_row(0)
    crows = (
        convolution(x, r0),
        convolution(y, r0),
        convolution(x, rv),
        convolution(y, rv),
    )
    drows = (
        convolution(y, rp),
        convolution(z, rp),
        convolution(y, rvp),
        convolution(z, rvp),
    )
    return crows, drows


def main():
    max_order = 7
    max_ell = 12
    atlas = nx.graph_atlas_g()
    cells = 0
    by_order = {}
    minima = {"g1": None, "g2": None}
    negatives = []

    for order in range(1, max_order + 1):
        local = 0
        forests = [
            nx.convert_node_labels_to_integers(g)
            for g in atlas
            if len(g) == order and nx.is_forest(g)
        ]
        for forest in forests:
            for v in forest:
                component = nx.node_connected_component(forest, v)
                for p in component:
                    for ell in range(1, max_ell + 1):
                        crows, drows = rows_for_cell(forest, v, p, ell)
                        gamma1 = gamma(crows, drows, 1)
                        gamma2 = gamma(crows, drows, 2)
                        values = {"g1": gamma1, "g2": gamma2 - 2 * gamma1}
                        record = {
                            **values,
                            "F_order": order,
                            "F_graph6": graph6(forest),
                            "F_edges": sorted(tuple(sorted(edge)) for edge in forest.edges()),
                            "v": v,
                            "p": p,
                            "ell": ell,
                            "p_equals_v": p == v,
                            "Gamma_0_to_2": [0, gamma1, gamma2],
                        }
                        for key, value in values.items():
                            if minima[key] is None or value < minima[key][key]:
                                minima[key] = record
                            if value < 0 and len(negatives) < 100:
                                negatives.append({"coefficient": key, **record})
                        cells += 1
                        local += 1
        by_order[str(order)] = {"forests": len(forests), "cells": local}

    report = {
        "marker": "PROBE_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_CENSUS_ROOT",
        "coverage": {
            "F_orders": [1, max_order],
            "path_lengths_ell": [1, max_ell],
            "placements": "every ordered (v,p) in one component, including p=v",
            "cells": cells,
            "by_order": by_order,
        },
        "minima": minima,
        "negative_count_capped_records": len(negatives),
        "negative_records": negatives,
        "scope_guard": "Finite exact evidence only; not an all-order sign theorem.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "cells": cells,
        "minima": minima,
        "negative_records": len(negatives),
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
