#!/usr/bin/env python3
"""Complete finite diagnostic for connected-nonadjacent M5 and M5+3*C5.

Every unlabeled forest G of order 2 through 14 and every nonadjacent pair in
one component is enumerated.  The exact occupation rows A,B,C,D are formed,
and the frozen residual blocks are evaluated.  This is a finite certificate
only and is never extrapolated to larger orders.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from census_iso_n5_c5_adjacent_all_forest_g1_bernstein import (
    KNOWN_FOREST_COUNTS,
    at,
    forest_graphs,
    h_c,
    ell_c,
    k_c,
)
from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_connected_nonadjacent_m5_s_finite_probe_g1_bernstein_20260830.json"
MARKER = "PROBE_EXACT_FINITE_ISO_N5_G1_CONNECTED_NONADJACENT_M5_S_G1_BERNSTEIN"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def h_m(a) -> int:
    return (
        2*at(a, 1)*at(a, 4) - 2*at(a, 1)*at(a, 5) - 6*at(a, 1)*at(a, 6)
        + 6*at(a, 2)*at(a, 3) - 8*at(a, 2)*at(a, 5)
        + 2*at(a, 3)**2 + 6*at(a, 3)*at(a, 4)
    )


def ell_m(a, b) -> int:
    return (
        2*at(a, 1)*at(b, 3) - at(a, 1)*at(b, 4) - 6*at(a, 1)*at(b, 5)
        + 4*at(a, 2)*at(b, 2) + at(a, 2)*at(b, 3) - 2*at(a, 2)*at(b, 4)
        + 2*at(a, 3)*at(b, 1) + at(a, 3)*at(b, 2) + 8*at(a, 3)*at(b, 3)
        - at(a, 4)*at(b, 1) - 2*at(a, 4)*at(b, 2) - 6*at(a, 5)*at(b, 1)
    )


def k_m(b, c) -> int:
    return (
        2*at(b, 1)*at(c, 2) - 6*at(b, 1)*at(c, 4)
        + 2*at(b, 2)*at(c, 1) + 4*at(b, 2)*at(c, 3)
        + 4*at(b, 3)*at(c, 2) - 6*at(b, 4)*at(c, 1)
    )


def m5(a, b, c, d) -> int:
    return h_m(a) + ell_m(a, b) + ell_m(a, c) + k_m(b, c) + k_m(a, d)


def c5(a, b, c, d) -> int:
    return h_c(a) + ell_c(a, b) + ell_c(a, c) + k_c(b, c) + k_c(a, d)


def empty_bucket() -> dict:
    return {
        "checks": 0,
        "negative": 0,
        "zero": 0,
        "minimum": None,
        "smallest_positive": None,
    }


def update(bucket: dict, value: int, witness: dict) -> None:
    bucket["checks"] += 1
    bucket["negative"] += int(value < 0)
    bucket["zero"] += int(value == 0)
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": int(value), **witness}
    if value > 0 and (
        bucket["smallest_positive"] is None
        or value < bucket["smallest_positive"]["value"]
    ):
        bucket["smallest_positive"] = {"value": int(value), **witness}


def main() -> None:
    rows = {}
    global_m = empty_bucket()
    global_c = empty_bucket()
    global_s = empty_bucket()
    by_distance = {"2": {"M5": empty_bucket(), "S": empty_bucket()},
                   "3+": {"M5": empty_bucket(), "S": empty_bucket()}}
    stream = hashlib.sha256()
    total_forests = total_cells = 0
    for order in range(2, 15):
        forest_count = cells = 0
        bucket_m, bucket_c, bucket_s = empty_bucket(), empty_bucket(), empty_bucket()
        for forest_index, graph0 in enumerate(forest_graphs(order)):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph0)
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            cache = {}

            def row(deleted):
                key = frozenset(deleted)
                if key not in cache:
                    kept = [vertex for vertex in graph if vertex not in key]
                    cache[key] = tuple(poly_forest(graph.subgraph(kept)))
                return cache[key]

            for component in nx.connected_components(graph):
                for u, v in itertools.combinations(sorted(component), 2):
                    if graph.has_edge(u, v):
                        continue
                    distance = int(nx.shortest_path_length(graph, u, v))
                    a = row((u, v))
                    closed_u = {u, *graph.neighbors(u)}
                    closed_v = {v, *graph.neighbors(v)}
                    b = row({u} | closed_v)
                    c = row({v} | closed_u)
                    d = row(closed_u | closed_v)
                    mv = m5(a, b, c, d)
                    cv = c5(a, b, c, d)
                    sv = mv + 3 * cv
                    n = len(graph) - 2
                    r = at(b, 1) + at(c, 1) - at(a, 1)
                    assert at(d, 1) == r + int(distance == 2)
                    assert graph.subgraph([x for x in graph if x not in (u, v)]).number_of_edges() <= r + 1
                    witness = {
                        "order_G": order,
                        "order_A": n,
                        "forest_index": forest_index,
                        "graph6": graph6,
                        "marks": [int(u), int(v)],
                        "distance": distance,
                        "r": int(r),
                    }
                    for bucket, value in (
                        (bucket_m, mv), (bucket_c, cv), (bucket_s, sv),
                        (global_m, mv), (global_c, cv), (global_s, sv),
                    ):
                        update(bucket, value, witness)
                    key = "2" if distance == 2 else "3+"
                    update(by_distance[key]["M5"], mv, witness)
                    update(by_distance[key]["S"], sv, witness)
                    stream.update(f"{order}|{forest_index}|{graph6}|{u}|{v}|{mv}|{cv}|{sv};".encode())
                    cells += 1
        assert forest_count == KNOWN_FOREST_COUNTS[order]
        assert cells == bucket_m["checks"] == bucket_c["checks"] == bucket_s["checks"]
        total_forests += forest_count
        total_cells += cells
        rows[str(order)] = {
            "unlabeled_forests": forest_count,
            "connected_nonadjacent_cells": cells,
            "M5": bucket_m,
            "C5": bucket_c,
            "S": bucket_s,
        }
        print(json.dumps({"order": order, **rows[str(order)]}, sort_keys=True), flush=True)

    assert total_cells == global_m["checks"] == global_c["checks"] == global_s["checks"]
    assert global_c["negative"] == 0
    report = {
        "marker": MARKER,
        "finite_scope": {
            "orders_G": [2, 14],
            "orders_A": [0, 12],
            "unlabeled_forests": total_forests,
            "connected_nonadjacent_mark_cells": total_cells,
            "complete_within_orders": True,
            "known_unlabeled_forest_counts_checked": True,
        },
        "exact_identity_evaluated": (
            "M5=HM(A)+LM(A,B)+LM(A,C)+KM(B,C)+KM(A,D); S=M5+3*C5"
        ),
        "global": {"M5": global_m, "C5": global_c, "S": global_s},
        "by_distance": by_distance,
        "rows": rows,
        "ordered_cell_stream_sha256": stream.hexdigest().upper(),
        "dependencies_sha256": {
            "derive_iso_n5_g1_connected_nonadjacent_m5_residual_g1_bernstein.py": sha256(
                HERE / "derive_iso_n5_g1_connected_nonadjacent_m5_residual_g1_bernstein.py"
            ),
            "census_iso_n5_c5_adjacent_all_forest_g1_bernstein.py": sha256(
                HERE / "census_iso_n5_c5_adjacent_all_forest_g1_bernstein.py"
            ),
            "probe_iso_leaf_cross_remainder_root.py": sha256(
                HERE / "probe_iso_leaf_cross_remainder_root.py"
            ),
        },
        "status": "complete finite diagnostic only; no all-order sign is asserted",
        "scope": (
            "Connected-nonadjacent cells with |G|<=14 only. This does not prove "
            "M5 or M5+3*C5 at larger orders, g1, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_scope": report["finite_scope"],
        "global": report["global"],
        "ordered_cell_stream_sha256": report["ordered_cell_stream_sha256"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
