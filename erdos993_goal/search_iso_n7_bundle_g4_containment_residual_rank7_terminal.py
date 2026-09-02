#!/usr/bin/env python3
"""Deterministic genuine-forest search for the rank-seven g4 lower residual.

The input is the exact containment/high-rank probe residual after ranks 8, 7,
and 6 have been paid.  This script evaluates that *lower bound* on every
marked atlas forest and a deterministic collection of larger random forests.
It is search evidence only, never a theorem certificate.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import random
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
PROBE_SOURCE = HERE / "probe_iso_n7_bundle_g4_containment_elimination_rank7_terminal.py"
PROBE_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_containment_residual_search_rank7_terminal_20260831.json"
MARKER = "SEARCH_GENUINE_ISO_N7_BUNDLE_G4_CONTAINMENT_RESIDUAL_RANK7_TERMINAL"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left, right, maximum=5):
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(maximum + 1)
    )


def multiply(left, right, maximum=5):
    return tuple(
        sum(
            (left[index] if index < len(left) else 0)
            * (right[rank - index] if rank - index < len(right) else 0)
            for index in range(rank + 1)
        )
        for rank in range(maximum + 1)
    )


def independence_row(graph, removed=(), maximum=5):
    live = set(graph) - set(removed)
    answer = (1,) + (0,) * maximum
    seen = set()
    for start in sorted(live):
        if start in seen:
            continue
        parent = {start: None}
        order = [start]
        seen.add(start)
        for vertex in order:
            for neighbour in sorted(graph[vertex]):
                if neighbour not in live or neighbour == parent[vertex]:
                    continue
                assert neighbour not in parent, "input must be a forest"
                parent[neighbour] = vertex
                order.append(neighbour)
                seen.add(neighbour)
        states = {}
        for vertex in reversed(order):
            excluded = (1,) + (0,) * maximum
            included = (0, 1) + (0,) * (maximum - 1)
            for child in sorted(graph[vertex]):
                if parent.get(child) != vertex:
                    continue
                child_out, child_in = states[child]
                excluded = multiply(excluded, add(child_out, child_in, maximum), maximum)
                included = multiply(included, child_out, maximum)
            states[vertex] = excluded, included
        component = add(*states[start], maximum)
        answer = multiply(answer, component, maximum)
    return answer


def categories(graph, u, v):
    e = independence_row(graph)
    cu = independence_row(graph, (u,))
    cv = independence_row(graph, (v,))
    w = independence_row(graph, (u, v))
    values = {"n": len(graph)}
    for rank in range(2, 6):
        values[f"W{rank}"] = w[rank]
        values[f"A{rank}"] = cu[rank] - w[rank]
        values[f"B{rank}"] = cv[rank] - w[rank]
        values[f"Z{rank}"] = e[rank] - cu[rank] - cv[rank] + w[rank]
        assert min(
            values[f"W{rank}"], values[f"A{rank}"],
            values[f"B{rank}"], values[f"Z{rank}"],
        ) >= 0
    return values


def main():
    probe = json.loads(PROBE_REPORT.read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"
    )
    expected_probe_source = probe["source_sha256"]
    assert sha256(PROBE_SOURCE) == expected_probe_source
    symbols = {
        name: sp.Symbol(name, integer=True, nonnegative=True)
        for name in ["n"] + [f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)]
    }
    expression = sp.cancel(sp.sympify(probe["residual_expression"], locals=symbols))
    numerator, denominator = sp.fraction(expression)
    assert denominator.is_Integer and denominator > 0
    arguments = tuple(symbols[name] for name in sorted(symbols))
    evaluate = sp.lambdify(arguments, numerator, "math")

    cells = 0
    negatives = []
    minimum = None
    stream = hashlib.sha256()

    def check(graph, graph_id, pairs):
        nonlocal cells, minimum
        for u, v in pairs:
            values = categories(graph, u, v)
            result_num = int(evaluate(*(values[str(symbol)] for symbol in arguments)))
            assert result_num % int(denominator) == 0
            result = result_num // int(denominator)
            cells += 1
            record = (graph_id, len(graph), u, v, result)
            stream.update((json.dumps(record, separators=(",", ":")) + ";").encode())
            if minimum is None or result < minimum["value"]:
                minimum = {
                    "value": result,
                    "graph": graph_id,
                    "order": len(graph),
                    "u": u,
                    "v": v,
                    "categories": values,
                }
            if result < 0 and len(negatives) < 20:
                negatives.append(minimum.copy())

    atlas_graphs = 0
    atlas_cells = 0
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        atlas_graphs += 1
        before = cells
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        check(graph, f"atlas:{graph6}", itertools.combinations(sorted(graph), 2))
        atlas_cells += cells - before

    rng = random.Random(9930704)
    random_graphs = 0
    random_cells = 0
    for order in range(8, 81):
        samples = 30 if order <= 30 else 10
        for sample in range(samples):
            prufer = [rng.randrange(order) for _ in range(order - 2)]
            graph = nx.from_prufer_sequence(prufer)
            for edge in list(graph.edges()):
                if rng.random() < 0.18:
                    graph.remove_edge(*edge)
            pair_pool = list(itertools.combinations(range(order), 2))
            rng.shuffle(pair_pool)
            before = cells
            check(
                graph,
                f"random:{order}:{sample}",
                pair_pool[: min(16, len(pair_pool))],
            )
            random_cells += cells - before
            random_graphs += 1

    report = {
        "marker": MARKER,
        "residual_role": "valid containment/high-rank lower bound, not exact g4",
        "denominator": int(denominator),
        "atlas": {"forests": atlas_graphs, "marked_cells": atlas_cells},
        "random": {
            "seed": 9930704,
            "orders": [8, 80],
            "forests": random_graphs,
            "marked_cells": random_cells,
        },
        "total_cells": cells,
        "negative_count_retained": len(negatives),
        "negative_witnesses": negatives,
        "minimum": minimum,
        "ordered_case_stream_sha256": stream.hexdigest().upper(),
        "status": "search evidence only; no sign theorem asserted",
        "dependencies_sha256": {
            PROBE_SOURCE.name: expected_probe_source,
            PROBE_REPORT.name: sha256(PROBE_REPORT),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "total_cells": cells,
        "minimum": minimum,
        "negative_count_retained": len(negatives),
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
