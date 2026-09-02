#!/usr/bin/env python3
"""Exact finite probe of the one-sided adjacent g1 deletion face.

For every forest A through order twelve and every deletion of at most one
vertex per component, put B=A-D and C=A.  The exact deficit identity gives
S(A,B,A)=S(A,A,A)-T(A,A-B).  This probe records the sign and sharp finite
minima.  It is finite evidence only, not an all-order theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from audit_iso_n5_c5_disconnected_nonadjacent_independent_root import (
    forest_graphs,
    independent_row,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_one_sided_deficit_probe_root_20260830.json"
MARKER = "PROBE_EXACT_FINITE_ISO_N5_G1_ADJACENT_ONE_SIDED_DEFICIT_ROOT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def s_face(a):
    a = [at(a, rank) for rank in range(7)]
    return (
        4*a[1]*a[2] + 2*a[1]*a[3] - 26*a[1]*a[4]
        - 29*a[1]*a[5] - 6*a[1]*a[6] + 14*a[2]**2
        + 30*a[2]*a[3] - 8*a[2]*a[4] - 8*a[2]*a[5]
        + 21*a[3]**2 + 6*a[3]*a[4]
    )


def t_form(a, x):
    a = [at(a, rank) for rank in range(7)]
    x = [at(x, rank) for rank in range(6)]
    return (
        2*a[1]*x[2] - a[1]*x[3] - 10*a[1]*x[4] - 6*a[1]*x[5]
        + 2*a[2]*x[1] + 10*a[2]*x[2] + 8*a[2]*x[3] - 2*a[2]*x[4]
        - a[3]*x[1] + 8*a[3]*x[2] + 8*a[3]*x[3]
        - 10*a[4]*x[1] - 2*a[4]*x[2] - 6*a[5]*x[1]
    )


def main():
    total_forests = total_patterns = 0
    global_minimum = None
    global_witness = None
    maximum_t = None
    maximum_t_witness = None
    rows = {}
    digest = hashlib.sha256()
    for order in range(13):
        count = patterns = 0
        minimum = None
        for forest_index, graph in enumerate(forest_graphs(order)):
            count += 1
            a = independent_row(graph)
            components = [tuple(sorted(part)) for part in nx.connected_components(graph)]
            choices = [tuple([None, *part]) for part in components]
            for selection in itertools.product(*choices):
                reduced = graph.copy()
                selected = tuple(vertex for vertex in selection if vertex is not None)
                reduced.remove_nodes_from(selected)
                b = independent_row(reduced)
                length = max(len(a), len(b))
                x = tuple(at(a, rank)-at(b, rank) for rank in range(length))
                assert all(value >= 0 for value in x)
                face = s_face(a)
                payment = t_form(a, x)
                value = face-payment
                assert value >= 0, (order, forest_index, selected, value, face, payment)
                witness = {
                    "order": order,
                    "forest_index": forest_index,
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    "selected_one_per_component": list(selected),
                    "A": list(a),
                    "B": list(b),
                    "X": list(x),
                    "S_AAA": face,
                    "T_A_X": payment,
                    "S_one_sided": value,
                }
                if minimum is None or value < minimum:
                    minimum = value
                if global_minimum is None or value < global_minimum:
                    global_minimum, global_witness = value, witness
                if maximum_t is None or payment > maximum_t:
                    maximum_t, maximum_t_witness = payment, witness
                digest.update(f"{order}|{forest_index}|{selected}|{a}|{b}|{value};".encode())
                patterns += 1
        rows[str(order)] = {"forests": count, "patterns": patterns, "minimum": minimum}
        total_forests += count
        total_patterns += patterns
    assert total_forests == 2949
    assert total_patterns == 200255
    report = {
        "marker": MARKER,
        "orders": [0, 12],
        "forests": total_forests,
        "componentwise_deletion_patterns": total_patterns,
        "minimum_S_one_sided": global_minimum,
        "minimum_witness": global_witness,
        "maximum_T_A_X": maximum_t,
        "maximum_T_witness": maximum_t_witness,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "rows": rows,
        "scope": "Complete finite one-sided face through |A|=12 only; no all-order claim.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "forests": total_forests,
        "patterns": total_patterns,
        "minimum": global_minimum,
        "maximum_T": maximum_t,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
