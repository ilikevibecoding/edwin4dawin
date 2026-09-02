#!/usr/bin/env python3
"""Exact finite componentwise-deletion census for unique sum14."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import (
    KNOWN_FOREST_COUNTS,
    forest_graphs,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    at,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum14_finite_componentwise_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM14_FINITE_COMPONENTWISE_ROOT"


def main():
    expression = sp.expand(2 * unique_expressions(interval_cells(P, H))[13])
    assert all(sp.denom(coefficient) == 1 for coefficient in sp.Poly(expression, *P, *H).coeffs())
    evaluator = sp.lambdify((*P, *H), expression, modules="math")

    total_forests = total_patterns = 0
    global_minimum = None
    global_witness = None
    rows = {}
    stream = hashlib.sha256()
    for order in range(13):
        count = patterns = 0
        local_minimum = None
        local_witness = None
        for graph in forest_graphs(order):
            count += 1
            base_raw = poly_forest(graph)
            base = tuple(at(base_raw, rank) for rank in range(8))
            components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
            choices = [(None, *component) for component in components]
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for selection in itertools.product(*choices):
                selected = tuple(vertex for vertex in selection if vertex is not None)
                reduced = graph.copy()
                reduced.remove_nodes_from(selected)
                lower_raw = poly_forest(reduced)
                lower = tuple(at(lower_raw, rank) for rank in range(7))
                value = int(evaluator(*base, *lower))
                assert value >= 0, (order, graph6, selected, value)
                stream.update(
                    f"{order}|{graph6}|{','.join(map(str, selected))}|{value}\n".encode()
                )
                witness = {
                    "graph6": graph6,
                    "selected_one_per_component": list(selected),
                    "P_coefficients_0_through_7": base,
                    "H_coefficients_0_through_6": lower,
                }
                if local_minimum is None or value < local_minimum:
                    local_minimum = value
                    local_witness = witness
                if global_minimum is None or value < global_minimum:
                    global_minimum = value
                    global_witness = witness
                patterns += 1
        assert count == KNOWN_FOREST_COUNTS[order]
        total_forests += count
        total_patterns += patterns
        rows[str(order)] = {
            "order": order,
            "unlabeled_forests": count,
            "componentwise_deletion_patterns": patterns,
            "minimum_twice_sum14": local_minimum,
            "minimizing_witness": local_witness,
        }
        print(order, count, patterns, local_minimum, flush=True)

    assert total_forests == 2949
    # This direct census retains selected isolated vertices instead of first
    # extracting them into a Newton factor, so it has 200,255 literal patterns.
    assert total_patterns == 200255
    assert global_minimum == 0
    report = {
        "marker": MARKER,
        "theorem": (
            "For every forest P of order at most twelve and every set S "
            "containing at most one vertex per component, unique sum14(P,P-S)>=0."
        ),
        "orders": [0, 12],
        "unlabeled_forests": total_forests,
        "componentwise_deletion_patterns": total_patterns,
        "twice_sum14_checks": total_patterns,
        "global_minimum_twice_sum14": global_minimum,
        "global_minimizing_witness": global_witness,
        "ordered_value_stream_sha256": stream.hexdigest().upper(),
        "rows": rows,
        "geometry": (
            "Each component independently contributes either no deleted vertex "
            "or one chosen vertex; this is exactly componentwise deletion."
        ),
        "scope": (
            "Exact finite componentwise unique-sum14 theorem through order twelve. "
            "The n>=13 ratio cones and other interval sums are separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
