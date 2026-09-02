#!/usr/bin/env python3
"""Literal nonadjacent endpoint-parent rank-six G2 census for N<=8."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from census_iso_n6_bundle_g2_adjacent_actual_n0_8_root import (
    bilinear,
    graph6,
    independence_row,
)
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    L2_TERMS,
)
from probe_iso_n6_bundle_g2_adjacent_endpoint_wedge_flint_rank7_g5_finish import (
    M2_TERMS,
    R2_TERMS,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_actual_n0_8_"
    "exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_ACTUAL_N0_8_ROOT"
)
OCCUPATION = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_"
    "exact_root_20260831.json"
)
OCCUPATION_SHA256 = (
    "9DDD8602D189BFE8F932E70919970F663B9DFA1F36AC60DF1BBCC2BA7DA58437"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def delete_vertices(graph: nx.Graph, vertices) -> nx.Graph:
    result = graph.copy()
    result.remove_nodes_from(set(vertices) & set(result))
    return result


def closed_neighborhood(graph: nx.Graph, vertex: int) -> set[int]:
    return {vertex, *graph.neighbors(vertex)}


def main() -> None:
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    occupation = json.loads(OCCUPATION.read_text(encoding="utf-8"))
    assert occupation["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_PARENT_"
        "OCCUPATION_ROOT"
    )
    assert occupation["endpoint_u_split"] == (
        "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)+R2(A,D)"
    )

    per_order = {}
    total_forests = total_oriented_nonedges = total_negative = 0
    global_minimum = None
    global_witness = None
    stream = hashlib.sha256()
    for marked_order in range(2, 11):
        common_order = marked_order - 2
        forest_count = oriented_nonedges = negative = 0
        minimum = None
        witness = None
        for graph0 in forest_graphs(marked_order):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            code = graph6(graph)
            nonedges = [
                (u, v) for u in graph for v in graph
                if u < v and not graph.has_edge(u, v)
            ]
            for left, right in nonedges:
                for u, v in ((left, right), (right, left)):
                    oriented_nonedges += 1
                    a_graph = delete_vertices(graph, (u, v))
                    # B is the residual row when v is included; C when u is
                    # included.  Because u,v are nonadjacent, explicitly
                    # remove the other mark from each single-mark row.
                    b_graph = delete_vertices(
                        graph, closed_neighborhood(graph, v) | {u}
                    )
                    c_graph = delete_vertices(
                        graph, closed_neighborhood(graph, u) | {v}
                    )
                    d_graph = delete_vertices(
                        graph,
                        closed_neighborhood(graph, u)
                        | closed_neighborhood(graph, v),
                    )
                    a = independence_row(a_graph, 7)
                    b = independence_row(b_graph, 6)
                    c = independence_row(c_graph, 6)
                    d = independence_row(d_graph, 5)
                    assert a[1] == common_order
                    value = (
                        bilinear(a, a, A2_TERMS)
                        + bilinear(a, b, L2_TERMS)
                        + bilinear(a, c, M2_TERMS)
                        + bilinear(b, c, R2_TERMS)
                        + bilinear(a, d, R2_TERMS)
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
                        "D_i0_through_i5": list(d),
                    }
                    stream.update(
                        (
                            f"{marked_order}|{code}|{u}|{v}|{value}|"
                            f"{a}|{b}|{c}|{d};"
                        ).encode()
                    )
                    candidate = (value, code, u, v)
                    if minimum is None or candidate < minimum:
                        minimum = candidate
                        witness = record
        assert minimum is not None and witness is not None
        assert negative == 0
        per_order[str(common_order)] = {
            "marked_forest_order": marked_order,
            "unlabeled_forests": forest_count,
            "oriented_nonadjacent_marked_pairs": oriented_nonedges,
            "negative": negative,
            "minimum": minimum[0],
            "minimum_witness": witness,
        }
        total_forests += forest_count
        total_oriented_nonedges += oriented_nonedges
        total_negative += negative
        candidate = (minimum[0], common_order)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = witness
        print(
            f"AUDITED N={common_order} forests={forest_count} "
            f"oriented_nonedges={oriented_nonedges} min={minimum[0]}",
            flush=True,
        )

    assert total_negative == 0
    report = {
        "marker": MARKER,
        "status": "PASS exact literal oriented marked-forest census",
        "theorem": (
            "For every nonadjacent-mark rank-six geometry with common order "
            "0<=N<=8 and deleted parent at either marked endpoint, G2 is "
            "nonnegative."
        ),
        "per_common_order": per_order,
        "aggregate": {
            "unlabeled_forests_across_marked_orders": total_forests,
            "oriented_nonadjacent_marked_pairs": total_oriented_nonedges,
            "negative": total_negative,
            "global_minimum": global_minimum[0],
            "global_minimum_witness": global_witness,
            "ordered_literal_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_argument": {
            "marked_order": "|H|=N+2, so N<=8 is exactly |H|<=10",
            "orientation": (
                "both orientations of every nonedge are checked, placing "
                "the parent at either marked endpoint"
            ),
            "functional": occupation["endpoint_u_split"],
            "rows": (
                "A=H-{u,v}; B=H-(N[v] union {u}); "
                "C=H-(N[u] union {v}); D=H-(N[u] union N[v])"
            ),
        },
        "occupation_report": {
            "file": OCCUPATION.name,
            "sha256": OCCUPATION_SHA256,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "oriented_pairs": total_oriented_nonedges,
        "negative": total_negative,
        "minimum": global_minimum[0],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
