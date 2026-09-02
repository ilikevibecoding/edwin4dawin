#!/usr/bin/env python3
"""Literal marked-forest census for nonadjacent no-parent rank-six g2, N<=8.

Here N is the order of A=I(H-{u,v}) and |H|=N+2.  Every unlabeled forest H
through order ten and every unordered nonedge uv is checked with the exact
coupled rows

  B=I(H-({u} union N[v])), C=I(H-({v} union N[u])),
  D=I(H-(N[u] union N[v])).
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from census_iso_n6_bundle_g2_adjacent_actual_n0_8_root import (
    add,
    bilinear,
    convolve,
    graph6,
    independence_row,
    sha256,
)
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_actual_n0_8_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ACTUAL_N0_8_ROOT"
OCCUPATION = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OCCUPATION_SHA256 = "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83"


def deleted_graph(graph: nx.Graph, deleted) -> nx.Graph:
    reduced = graph.copy()
    reduced.remove_nodes_from(deleted)
    return reduced


def main() -> None:
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    occupation = json.loads(OCCUPATION.read_text(encoding="utf-8"))
    assert occupation["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NO_PARENT_OCCUPATION_ROOT"
    assert occupation["occupation_rows_nonadjacent"] == (
        "W=A,U=A+xB,V=A+xC,E=A+xB+xC+x^2D"
    )

    per_common_order = {}
    total_forests = 0
    total_marked_nonedges = 0
    total_negative = 0
    global_minimum = None
    global_witness = None
    stream = hashlib.sha256()

    for marked_order in range(2, 11):
        common_order = marked_order - 2
        forest_count = 0
        marked_nonedges = 0
        negative = 0
        minimum = None
        witness = None
        for graph0 in forest_graphs(marked_order):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            code = graph6(graph)
            row_cache = {}

            def row(deleted) -> tuple[int, ...]:
                key = frozenset(deleted)
                if key not in row_cache:
                    row_cache[key] = independence_row(deleted_graph(graph, key), 7)
                return row_cache[key]

            e_row = row(())
            for u, v in itertools.combinations(graph.nodes(), 2):
                if graph.has_edge(u, v):
                    continue
                marked_nonedges += 1
                closed_u = {u, *graph.neighbors(u)}
                closed_v = {v, *graph.neighbors(v)}
                a = row((u, v))
                b = row({u, *closed_v})
                c = row({v, *closed_u})
                d = row(closed_u | closed_v)
                assert a[1] == common_order

                u_row = row((u,))
                v_row = row((v,))
                for rank in range(1, 8):
                    assert u_row[rank] == a[rank] + b[rank - 1]
                    assert v_row[rank] == a[rank] + c[rank - 1]
                    d_shift = d[rank - 2] if rank >= 2 else 0
                    assert e_row[rank] == (
                        a[rank] + b[rank - 1] + c[rank - 1] + d_shift
                    )

                value = (
                    bilinear(a, a, A2_TERMS)
                    + bilinear(a, b, L2_TERMS)
                    + bilinear(a, c, L2_TERMS)
                    + bilinear(b, c, K2_TERMS)
                    + bilinear(a, d, K2_TERMS)
                )
                negative += int(value < 0)
                record = {
                    "value": value,
                    "marked_forest_order": marked_order,
                    "common_A_order": common_order,
                    "graph6": code,
                    "marks": [u, v],
                    "A_i0_through_i7": list(a),
                    "B_i0_through_i6": list(b[:7]),
                    "C_i0_through_i6": list(c[:7]),
                    "D_i0_through_i6": list(d[:7]),
                }
                stream.update(
                    f"{marked_order}|{code}|{u}|{v}|{value}|{a}|{b}|{c}|{d};".encode()
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
            "nonadjacent_marked_pairs": marked_nonedges,
            "negative": negative,
            "minimum": minimum[0],
            "minimum_witness": witness,
        }
        total_forests += forest_count
        total_marked_nonedges += marked_nonedges
        total_negative += negative
        candidate = (minimum[0], common_order)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = witness
        print(
            f"AUDITED A_order={common_order} forests={forest_count} "
            f"marked_nonedges={marked_nonedges} negative=0 min={minimum[0]}",
            flush=True,
        )

    assert total_negative == 0
    assert global_minimum is not None and global_witness is not None
    report = {
        "marker": MARKER,
        "status": "PASS exact literal marked-forest census",
        "theorem": (
            "For every nonadjacent-mark canonical no-parent rank-six bundle "
            "geometry whose common forest row A has order 0<=N<=8, g2 is nonnegative."
        ),
        "per_common_order": per_common_order,
        "aggregate": {
            "unlabeled_forests_across_marked_orders": total_forests,
            "nonadjacent_marked_pairs": total_marked_nonedges,
            "negative": 0,
            "global_minimum": global_minimum[0],
            "global_minimum_witness": global_witness,
            "ordered_literal_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_argument": {
            "marked_order": "|H|=N+2, so N<=8 is exactly |H|<=10",
            "enumeration": "every unlabeled forest H and every unordered nonedge uv is checked",
            "coupled_rows": (
                "A=I(H-{u,v}), B=I(H-({u} union N[v])), "
                "C=I(H-({v} union N[u])), D=I(H-(N[u] union N[v])); "
                "U=A+xB, V=A+xC, E=A+xB+xC+x^2D are asserted coefficientwise"
            ),
            "occupation_functional": (
                "g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D)"
            ),
        },
        "occupation_report": {"file": OCCUPATION.name, "sha256": OCCUPATION_SHA256},
        "dependencies_sha256": {
            "census_iso_n6_bundle_g2_adjacent_actual_n0_8_root.py": hashlib.sha256(
                (HERE / "census_iso_n6_bundle_g2_adjacent_actual_n0_8_root.py").read_bytes()
            ).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "nonadjacent_marked_pairs": total_marked_nonedges,
        "negative": 0,
        "global_minimum": global_minimum[0],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
