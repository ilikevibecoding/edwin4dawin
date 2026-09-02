#!/usr/bin/env python3
"""Finite relaxed census for rank-five g3 over support transversals.

This deliberately ranges beyond canonical deepest cells: G is any two-marked
atlas forest and S is any independent set meeting each component at most once;
C=G and D=G-S.  A negative row would obstruct a universal-transversal proof.
Passing is finite evidence only.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path

import networkx as nx

from probe_iso_n5_bundle_g3_five_modes_bundle_g12 import (
    add_xd,
    convolve_isolates,
    forward,
    independence_row,
    marked_rows,
    nested,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g3_support_transversal_probe_bundle_g12_20260829.json"
MARKER = "FINITE_CENSUS_ISO_N5_BUNDLE_G3_SUPPORT_TRANSVERSAL_BUNDLE_G12"


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def g3(crows, drows):
    base = add_xd(crows, drows)
    values = []
    for number in range(4):
        top = nested(add_xd(convolve_isolates(crows, number), drows), 5)
        lower = sum(nested(convolve_isolates(crows, t), 4) for t in range(number))
        values.append(top - nested(base, 5) - lower)
    return int(forward(values)[3])


def valid_transversal(graph, chosen):
    chosen = set(chosen)
    if any(graph.has_edge(a, b) for a, b in itertools.combinations(chosen, 2)):
        return False
    return all(len(chosen & component) <= 1 for component in nx.connected_components(graph))


def main():
    total = 0
    negative = 0
    minimum = None
    by_size = Counter()
    min_by_size = {}
    first_negative = None
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        row_cache = {}
        for u, v in itertools.combinations(graph.nodes(), 2):
            crows = marked_rows(graph, u, v)
            for size in range(min(3, len(graph)) + 1):
                for chosen in itertools.combinations(graph.nodes(), size):
                    if not valid_transversal(graph, chosen):
                        continue
                    key = (chosen, u, v)
                    reduced = graph.copy(); reduced.remove_nodes_from(chosen)
                    drows = marked_rows(reduced, u, v)
                    value = g3(crows, drows)
                    total += 1
                    by_size[size] += 1
                    minimum = value if minimum is None else min(minimum, value)
                    min_by_size[size] = value if size not in min_by_size else min(min_by_size[size], value)
                    if value < 0:
                        negative += 1
                        if first_negative is None:
                            first_negative = {
                                "order": len(graph), "edges": sorted(map(list, graph.edges())),
                                "u": u, "v": v, "S": list(chosen), "g3": value,
                            }
    report = {
        "marker": MARKER,
        "scope": "all atlas forests order 2..7, all mark pairs, all independent component transversals S of size at most 3",
        "role": "finite relaxed census only; not a theorem",
        "cells": total,
        "minimum": minimum,
        "negative_count": negative,
        "first_negative": first_negative,
        "counts_by_S_size": dict(sorted(by_size.items())),
        "minima_by_S_size": dict(sorted(min_by_size.items())),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
