#!/usr/bin/env python3
"""Finite exact census for the full internal-spine one-ended-broom mode.

This extends the bare-path census by allowing k arbitrary collision leaves at
the protected child endpoint u.  Every graph-atlas forest F through order 7,
every connected ordered parent/mark placement (p,v), ell=1..10, and k=0..10
is checked exactly.  The output is evidence only, not an all-parameter proof.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import graph6, poly_forest
from probe_iso_n4_bundle_internal_spine_census_root import (
    convolution,
    gamma,
    path_row,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_internal_spine_broom_census_probe_root_20260829.json"


def add(left, right):
    return tuple(a + b for a, b in zip(left, right))


def shift(row):
    return (0, *row[:-1])


def isolate_row(number, maximum=5):
    return tuple(comb(number, rank) if rank <= number else 0 for rank in range(maximum + 1))


def extended_path(order):
    if order == -1:
        return (1, 0, 0, 0, 0, 0)
    if order == -2:
        return (0, 0, 0, 0, 0, 0)
    if order < -2:
        raise ValueError(order)
    return path_row(order)


def deleted_row(graph, removed):
    reduced = graph.copy()
    reduced.remove_nodes_from(removed)
    row = tuple(poly_forest(reduced))
    return row + (0,) * (6 - len(row))


def child_rows(ell, collision_leaves):
    h = isolate_row(collision_leaves)
    x = add(
        convolution(h, extended_path(ell - 1)),
        shift(extended_path(ell - 2)),
    )
    y = convolution(h, extended_path(ell - 1))
    a0 = add(
        convolution(h, extended_path(ell - 2)),
        shift(extended_path(ell - 3)),
    )
    b0 = convolution(h, extended_path(ell - 2))
    return x, y, a0, b0


def rows_for_cell(forest, v, p, ell, collision_leaves):
    r0 = deleted_row(forest, ())
    rv = deleted_row(forest, (v,))
    rp = deleted_row(forest, (p,))
    rvp = deleted_row(forest, (v, p))
    x, y, a0, b0 = child_rows(ell, collision_leaves)
    crows = (
        convolution(x, r0), convolution(y, r0),
        convolution(x, rv), convolution(y, rv),
    )
    drows = (
        convolution(a0, rp), convolution(b0, rp),
        convolution(a0, rvp), convolution(b0, rvp),
    )
    return crows, drows


def main():
    max_order = 7
    max_ell = 10
    max_collision = 10
    atlas = nx.graph_atlas_g()
    cells = 0
    minima = {"g1": None, "g2": None}
    negatives = []
    by_order = {}

    for order in range(1, max_order + 1):
        forests = [
            nx.convert_node_labels_to_integers(g)
            for g in atlas if len(g) == order and nx.is_forest(g)
        ]
        local = 0
        for forest in forests:
            for v in forest:
                component = nx.node_connected_component(forest, v)
                for p in component:
                    for ell in range(1, max_ell + 1):
                        for collision in range(max_collision + 1):
                            crows, drows = rows_for_cell(forest, v, p, ell, collision)
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
                                "p_equals_v": p == v,
                                "ell": ell,
                                "collision_leaves_k": collision,
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
        "marker": "PROBE_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_CENSUS_ROOT",
        "coverage": {
            "F_orders": [1, max_order],
            "ell": [1, max_ell],
            "collision_leaves_k": [0, max_collision],
            "placements": "all connected ordered (v,p), including p=v",
            "cells": cells,
            "by_order": by_order,
        },
        "minima": minima,
        "negative_count_capped_records": len(negatives),
        "negative_records": negatives,
        "scope_guard": "Finite exact evidence only; not an all-order theorem.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"], "cells": cells, "minima": minima,
        "negative_records": len(negatives),
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
