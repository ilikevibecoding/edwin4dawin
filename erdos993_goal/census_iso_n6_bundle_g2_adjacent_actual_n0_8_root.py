#!/usr/bin/env python3
"""Literal marked-forest census for adjacent no-parent rank-six g2, N<=8.

Here N is the order of the common row A=I(H-{u,v}); the marked forest H has
order N+2.  The independent coefficient box is too broad at these small
orders, so this script enumerates every unlabeled forest H through order ten,
every adjacent marked pair, and the exact coupled rows A,B,C.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_actual_n0_8_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ACTUAL_N0_8_ROOT"
OCCUPATION = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OCCUPATION_SHA256 = "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left, right, maximum: int) -> tuple[int, ...]:
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(maximum + 1)
    )


def convolve(left, right, maximum: int) -> tuple[int, ...]:
    return tuple(
        sum(
            (left[index] if index < len(left) else 0)
            * (right[rank - index] if rank - index < len(right) else 0)
            for index in range(rank + 1)
        )
        for rank in range(maximum + 1)
    )


def independence_row(graph: nx.Graph, maximum: int) -> tuple[int, ...]:
    total = (1,) + (0,) * maximum
    for component in nx.connected_components(graph):
        root = min(component)

        def visit(vertex, parent):
            excluded = (1,) + (0,) * maximum
            included = (0, 1) + (0,) * (maximum - 1)
            for child in sorted(graph.neighbors(vertex)):
                if child == parent:
                    continue
                child_excluded, child_included = visit(child, vertex)
                excluded = convolve(
                    excluded, add(child_excluded, child_included, maximum), maximum
                )
                included = convolve(included, child_excluded, maximum)
            return excluded, included

        component_row = add(*visit(root, None), maximum)
        total = convolve(total, component_row, maximum)
    return tuple(int(value) for value in total)


def bilinear(left, right, terms) -> int:
    return sum(coefficient * left[i] * right[j]
               for coefficient, i, j in terms)


def remove_closed_neighborhood(graph: nx.Graph, vertex: int) -> nx.Graph:
    reduced = graph.copy()
    reduced.remove_nodes_from({vertex, *graph.neighbors(vertex)})
    return reduced


def graph6(graph: nx.Graph) -> str:
    canonical_labels = nx.convert_node_labels_to_integers(graph, ordering="sorted")
    return nx.to_graph6_bytes(canonical_labels, header=False).decode().strip()


def main() -> None:
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    occupation = json.loads(OCCUPATION.read_text(encoding="utf-8"))
    assert occupation["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NO_PARENT_OCCUPATION_ROOT"
    assert occupation["occupation_rows_adjacent"] == "W=A,U=A+xB,V=A+xC,E=A+xB+xC"

    per_common_order = {}
    total_forests = 0
    total_marked_edges = 0
    total_negative = 0
    global_minimum = None
    global_witness = None
    stream = hashlib.sha256()
    for marked_order in range(2, 11):
        common_order = marked_order - 2
        forest_count = 0
        marked_edges = 0
        negative = 0
        minimum = None
        witness = None
        for graph0 in forest_graphs(marked_order):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            code = graph6(graph)
            for u, v in sorted(tuple(sorted(edge)) for edge in graph.edges()):
                marked_edges += 1
                w_graph = graph.copy()
                w_graph.remove_nodes_from((u, v))
                a = independence_row(w_graph, 7)
                b = independence_row(remove_closed_neighborhood(graph, v), 6)
                c = independence_row(remove_closed_neighborhood(graph, u), 6)
                assert a[1] == common_order

                # Independent sets containing one marked endpoint give xB or xC.
                u_graph = graph.copy()
                u_graph.remove_node(u)
                v_graph = graph.copy()
                v_graph.remove_node(v)
                e_row = independence_row(graph, 7)
                u_row = independence_row(u_graph, 7)
                v_row = independence_row(v_graph, 7)
                for rank in range(1, 8):
                    assert u_row[rank] - a[rank] == b[rank - 1]
                    assert v_row[rank] - a[rank] == c[rank - 1]
                    assert e_row[rank] == a[rank] + b[rank - 1] + c[rank - 1]

                value = (
                    bilinear(a, a, A2_TERMS)
                    + bilinear(a, b, L2_TERMS)
                    + bilinear(a, c, L2_TERMS)
                    + bilinear(b, c, K2_TERMS)
                )
                negative += int(value < 0)
                record = {
                    "value": value,
                    "marked_forest_order": marked_order,
                    "common_A_order": common_order,
                    "graph6": code,
                    "marks": [u, v],
                    "A_i0_through_i7": list(a),
                    "B_i0_through_i6": list(b),
                    "C_i0_through_i6": list(c),
                }
                stream.update(
                    f"{marked_order}|{code}|{u}|{v}|{value}|{a}|{b}|{c};".encode()
                )
                candidate = (value, code, u, v)
                if minimum is None or candidate < minimum:
                    minimum = candidate
                    witness = record
        assert minimum is not None and witness is not None
        assert negative == 0
        per_common_order[str(common_order)] = {
            "marked_forest_order": marked_order,
            "unlabeled_forests": forest_count,
            "adjacent_marked_pairs": marked_edges,
            "negative": negative,
            "minimum": minimum[0],
            "minimum_witness": witness,
        }
        total_forests += forest_count
        total_marked_edges += marked_edges
        total_negative += negative
        candidate = (minimum[0], common_order)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = witness
        print(
            f"AUDITED A_order={common_order} forests={forest_count} "
            f"marked_edges={marked_edges} negative=0 min={minimum[0]}",
            flush=True,
        )
    assert total_negative == 0
    assert global_minimum is not None and global_witness is not None
    report = {
        "marker": MARKER,
        "status": "PASS exact literal marked-forest census",
        "theorem": (
            "For every adjacent-mark canonical no-parent rank-six bundle geometry "
            "whose common forest row A has order 0<=N<=8, g2 is nonnegative."
        ),
        "per_common_order": per_common_order,
        "aggregate": {
            "unlabeled_forests_across_marked_orders": total_forests,
            "adjacent_marked_pairs": total_marked_edges,
            "negative": 0,
            "global_minimum": global_minimum[0],
            "global_minimum_witness": global_witness,
            "ordered_literal_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_argument": {
            "marked_order": "|H|=N+2, so N<=8 is exactly |H|<=10",
            "enumeration": "every unlabeled forest H and every edge uv is checked",
            "coupled_rows": (
                "A=I(H-{u,v}), B=I(H-N[v]), C=I(H-N[u]); the identities "
                "U=A+xB, V=A+xC, E=A+xB+xC are asserted coefficientwise"
            ),
            "occupation_functional": "g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)",
        },
        "occupation_report": {
            "file": OCCUPATION.name,
            "sha256": OCCUPATION_SHA256,
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "adjacent_marked_pairs": total_marked_edges,
        "negative": 0,
        "global_minimum": global_minimum[0],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
