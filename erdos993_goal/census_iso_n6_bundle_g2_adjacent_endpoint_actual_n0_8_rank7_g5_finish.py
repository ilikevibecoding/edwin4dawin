#!/usr/bin/env python3
"""Literal oriented marked-forest census for endpoint-parent g2, N<=8."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from census_iso_n6_bundle_g2_adjacent_actual_n0_8_root import (
    bilinear,
    graph6,
    independence_row,
    remove_closed_neighborhood,
)
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS, L2_TERMS
from probe_iso_n6_bundle_g2_adjacent_endpoint_wedge_flint_rank7_g5_finish import M2_TERMS, R2_TERMS
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_endpoint_actual_n0_8_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_ACTUAL_N0_8_RANK7_G5_FINISH"
OCCUPATION = HERE / "iso_n6_bundle_g2_adjacent_endpoint_occupation_exact_rank7_g5_finish_20260831.json"
OCCUPATION_SHA256 = "E3085D7739627E4BAB837208DFF2E8DBCA1A97ACB5073538398F2E3BE17377CD"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    occupation = json.loads(OCCUPATION.read_text(encoding="utf-8"))
    assert occupation["endpoint_u_split"] == "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)"
    per_order = {}
    total_forests = total_oriented_edges = total_negative = 0
    global_minimum = None
    global_witness = None
    stream = hashlib.sha256()
    for marked_order in range(2, 11):
        common_order = marked_order - 2
        forest_count = oriented_edges = negative = 0
        minimum = None
        witness = None
        for graph0 in forest_graphs(marked_order):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            code = graph6(graph)
            for left, right in sorted(tuple(sorted(edge)) for edge in graph.edges()):
                for u, v in ((left, right), (right, left)):
                    oriented_edges += 1
                    common = graph.copy()
                    common.remove_nodes_from((u, v))
                    a = independence_row(common, 7)
                    b = independence_row(remove_closed_neighborhood(graph, v), 6)
                    c = independence_row(remove_closed_neighborhood(graph, u), 6)
                    assert a[1] == common_order
                    value = (
                        bilinear(a, a, A2_TERMS)
                        + bilinear(a, b, L2_TERMS)
                        + bilinear(a, c, M2_TERMS)
                        + bilinear(b, c, R2_TERMS)
                    )
                    negative += int(value < 0)
                    record = {
                        "value": value,
                        "marked_forest_order": marked_order,
                        "common_A_order": common_order,
                        "graph6": code,
                        "parent_endpoint_u": u,
                        "other_mark_v": v,
                        "A_i0_through_i7": list(a),
                        "B_i0_through_i6": list(b),
                        "C_i0_through_i6": list(c),
                    }
                    stream.update(f"{marked_order}|{code}|{u}|{v}|{value}|{a}|{b}|{c};".encode())
                    candidate = (value, code, u, v)
                    if minimum is None or candidate < minimum:
                        minimum = candidate
                        witness = record
        assert minimum is not None and witness is not None
        assert negative == 0
        per_order[str(common_order)] = {
            "marked_forest_order": marked_order,
            "unlabeled_forests": forest_count,
            "oriented_adjacent_marked_pairs": oriented_edges,
            "negative": 0,
            "minimum": minimum[0],
            "minimum_witness": witness,
        }
        total_forests += forest_count
        total_oriented_edges += oriented_edges
        candidate = (minimum[0], common_order)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = witness
        print(f"AUDITED N={common_order} forests={forest_count} oriented_edges={oriented_edges} min={minimum[0]}", flush=True)
    assert total_negative == 0
    report = {
        "marker": MARKER,
        "status": "PASS exact literal oriented marked-forest census",
        "theorem": (
            "For every adjacent-mark rank-six geometry with common order 0<=N<=8 "
            "and parent at either marked endpoint, g2 is nonnegative."
        ),
        "per_common_order": per_order,
        "aggregate": {
            "unlabeled_forests_across_marked_orders": total_forests,
            "oriented_adjacent_marked_pairs": total_oriented_edges,
            "negative": 0,
            "global_minimum": global_minimum[0],
            "global_minimum_witness": global_witness,
            "ordered_literal_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_argument": {
            "marked_order": "|H|=N+2, so N<=8 is exactly |H|<=10",
            "orientation": "both orientations of every marked edge are checked, placing the parent at either endpoint",
            "functional": "endpoint_u g2=A2(A)+L2(A,B)+M2(A,C)+R2(B,C)",
        },
        "occupation_report": {"file": OCCUPATION.name, "sha256": OCCUPATION_SHA256},
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "oriented_pairs": total_oriented_edges, "negative": 0, "minimum": global_minimum[0]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
