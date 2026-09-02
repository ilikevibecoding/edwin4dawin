#!/usr/bin/env python3
"""Exact discovery probe for rank-five whole-bundle coefficient g3.

This file independently rebuilds the rank-five four-minor functional, checks
the frozen generic g3 row, and directly replays every rooted deepest bundle in
the graph atlas through order seven.  The replay is a finite census only, not
an all-order proof.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter, defaultdict
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
ROOT = HERE / "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g3_five_modes_probe_bundle_g12_20260829.json"
MARKER = "FINITE_CENSUS_ISO_N5_BUNDLE_G3_FIVE_MODES_BUNDLE_G12"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank: int):
    return row[rank] if 0 <= rank < len(row) else 0


def multiply(left, right, maximum=6):
    return tuple(
        sum(at(left, j) * at(right, rank - j) for j in range(rank + 1))
        for rank in range(maximum + 1)
    )


def isolate_row(number: int, maximum=6):
    return tuple(comb(number, rank) if rank <= number else 0 for rank in range(maximum + 1))


def convolve_isolates(rows, number: int, maximum=6):
    factor = isolate_row(number, maximum)
    return tuple(multiply(row, factor, maximum) for row in rows)


def add_xd(crows, drows, maximum=6):
    return tuple(
        tuple(at(crow, rank) + at(drow, rank - 1) for rank in range(maximum + 1))
        for crow, drow in zip(crows, drows)
    )


def nested(rows, rank: int):
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


def forward(values):
    values = list(values)
    out = []
    while values:
        out.append(values[0])
        values = [values[j + 1] - values[j] for j in range(len(values) - 1)]
    return out


def symbolic_raw_g3():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    values = []
    for number in range(4):
        enlarged = add_xd(convolve_isolates(crows, number), drows)
        lower = sum(nested(convolve_isolates(crows, t), 4) for t in range(number))
        values.append(sp.expand(nested(enlarged, 5) - nested(add_xd(crows, drows), 5) - lower))
    return sp.expand(forward(values)[3])


def independence_row(graph, maximum=6):
    nodes = tuple(graph.nodes())
    return tuple(
        sum(
            all(not graph.has_edge(a, b) for a, b in itertools.combinations(chosen, 2))
            for chosen in itertools.combinations(nodes, rank)
        )
        for rank in range(maximum + 1)
    )


def marked_rows(graph, u, v):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        minor = graph.copy()
        minor.remove_nodes_from(removed)
        rows.append(independence_row(minor))
    return tuple(rows)


def n_value(graph, u, v, rank):
    return nested(marked_rows(graph, u, v), rank)


def add_isolates(graph, number):
    result = graph.copy()
    start = max(result.nodes(), default=-1) + 1
    result.add_nodes_from(range(start, start + number))
    return result


def add_leaves(graph, support, number):
    result = graph.copy()
    start = max(result.nodes(), default=-1) + 1
    result.add_edges_from((support, start + j) for j in range(number))
    return result


def gamma(base, support, u, v, number):
    cgraph = base.copy()
    cgraph.remove_node(support)
    lower = sum(n_value(add_isolates(cgraph, t), u, v, 4) for t in range(number))
    return n_value(add_leaves(base, support, number), u, v, 5) - n_value(base, u, v, 5) - lower


def root_data(graph, u, v):
    parent, depth, children = {}, {}, {node: [] for node in graph}
    for component in nx.connected_components(graph):
        root = v if v in component else (u if u in component else min(component))
        distance = nx.single_source_shortest_path_length(graph, root)
        for node in component:
            depth[node] = distance[node]
            if node == root:
                parent[node] = None
            else:
                candidates = [w for w in graph.neighbors(node) if distance[w] + 1 == distance[node]]
                assert len(candidates) == 1
                parent[node] = candidates[0]
                children[candidates[0]].append(node)
    return parent, depth, children


def deepest_cell(graph, u, v):
    parent, depth, children = root_data(graph, u, v)
    candidates = []
    for support in graph:
        if support in (u, v):
            continue
        bundle = sorted(
            child for child in children[support]
            if child not in (u, v) and graph.degree(child) == 1
        )
        if bundle:
            candidates.append((depth[support], -support, support, bundle))
    if not candidates:
        return None
    _, _, support, bundle = max(candidates)
    return support, bundle, parent, children


def descendants(children, start):
    result, stack = set(), [start]
    while stack:
        node = stack.pop()
        if node in result:
            continue
        result.add(node)
        stack.extend(children[node])
    return result


def classify(graph, u, v, cell):
    support, bundle0, parent_map, children = cell
    bundle = set(bundle0)
    parent = parent_map[support]
    remaining = [child for child in children[support] if child not in bundle]
    same = nx.node_connected_component(graph, u) == nx.node_connected_component(graph, v)
    connector = nx.shortest_path(graph, u, v) if same else []
    if support in connector:
        position = connector.index(support)
        assert 0 < position < len(connector) - 1
        assert parent == connector[position + 1]
        assert remaining == [connector[position - 1]]
        child = remaining[0]
        path = set(nx.shortest_path(graph, child, u))
        extra = descendants(children, child) - path
        assert all(graph.degree(node) == 1 and graph.has_edge(node, u) for node in extra)
        return "internal_spine_endpoint" if parent == v else "internal_spine_ordinary"
    assert not remaining
    if parent is None:
        return "no_mark_root_k0"
    return "singleton_endpoint" if parent in (u, v) else "singleton_ordinary"


def main():
    frozen = json.loads(ROOT.read_text(encoding="utf-8"))
    raw = symbolic_raw_g3()
    local_symbols = {str(s): s for s in raw.free_symbols}
    recorded = sp.sympify(frozen["binomial_coefficients"][3]["factor"], locals=local_symbols)
    assert sp.expand(raw - recorded) == 0

    counts = Counter()
    minima = {}
    negative = Counter()
    orders = defaultdict(lambda: {"cells": 0, "minimum": None, "negative": 0})
    total = 0
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        for u, v in itertools.combinations(graph.nodes(), 2):
            cell = deepest_cell(graph, u, v)
            if cell is None:
                continue
            support, bundle, *_ = cell
            base = graph.copy()
            base.remove_nodes_from(bundle)
            values = [gamma(base, support, u, v, number) for number in range(4)]
            g3 = int(forward(values)[3])
            mode = classify(graph, u, v, cell)
            counts[mode] += 1
            total += 1
            minima[mode] = g3 if mode not in minima else min(minima[mode], g3)
            negative[mode] += int(g3 < 0)
            row = orders[len(graph)]
            row["cells"] += 1
            row["minimum"] = g3 if row["minimum"] is None else min(row["minimum"], g3)
            row["negative"] += int(g3 < 0)

    report = {
        "marker": MARKER,
        "generic_raw_g3_exact_match": True,
        "generic_raw_g3_term_count": len(sp.Poly(raw, *sorted(raw.free_symbols, key=str)).terms()),
        "atlas_scope": "all rooted deepest bundle cells in every unlabeled forest of orders 2 through 7",
        "role": "finite census only; not an all-order proof",
        "total_bundle_cells": total,
        "mode_counts": dict(sorted(counts.items())),
        "mode_minima": dict(sorted(minima.items())),
        "mode_negative_counts": dict(sorted(negative.items())),
        "order_summary": {str(k): v for k, v in sorted(orders.items())},
        "dependencies": {ROOT.name: sha256(ROOT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
