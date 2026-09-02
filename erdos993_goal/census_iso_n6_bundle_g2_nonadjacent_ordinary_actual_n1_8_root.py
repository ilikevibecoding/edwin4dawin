#!/usr/bin/env python3
"""Literal nonadjacent ordinary-parent rank-six g2 census for N=1..8."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from census_iso_n6_bundle_g2_adjacent_actual_n0_8_root import (
    bilinear,
    graph6,
    independence_row,
)
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_actual_n1_8_exact_root_20260831.json"
)
PASS_TOTAL = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_TOTAL_N1_8_ROOT"
FAIL = "COUNTEREXAMPLE_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_TOTAL_N1_8_ROOT"
LOSS = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
)
LOSS_SHA256 = "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def remove_vertices(graph: nx.Graph, vertices) -> nx.Graph:
    reduced = graph.copy()
    reduced.remove_nodes_from(vertices)
    return reduced


def closed(graph: nx.Graph, vertex: int) -> set[int]:
    return {vertex, *graph.neighbors(vertex)}


def update_minimum(current, candidate, record):
    if current is None or candidate < current[0]:
        return candidate, record
    return current


def main() -> None:
    assert sha256(LOSS) == LOSS_SHA256
    loss = json.loads(LOSS.read_text(encoding="utf-8"))
    assert loss["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PARENT_LOSS_ROOT"
    )
    local = {}
    for prefix, stop in (("a", 8), ("b", 7), ("c", 7), ("d", 7)):
        for rank in range(stop):
            local[f"{prefix}{rank}"] = sp.Symbol(f"{prefix}{rank}")
    for label in loss["active_parent_loss_variables"]:
        local[label] = sp.Symbol(label)
    correction_expr = sp.sympify(loss["correction"], locals=local)
    arguments = tuple(sorted(correction_expr.free_symbols, key=str))
    evaluate_correction = sp.lambdify(arguments, correction_expr, "math")

    per_order = {}
    classification = {}
    total_records = total_negative = total_negative_correction = 0
    global_minimum = global_correction_minimum = None
    global_witness = global_correction_witness = None
    stream = hashlib.sha256()
    for marked_order in range(3, 11):
        common_order = marked_order - 2
        records = negative = negative_correction = 0
        minimum = correction_minimum = None
        witness = correction_witness = None
        forest_count = 0
        for graph0 in forest_graphs(marked_order):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            code = graph6(graph)
            nodes = sorted(graph.nodes())
            for u, v in itertools.combinations(nodes, 2):
                if graph.has_edge(u, v):
                    continue
                closed_u = closed(graph, u)
                closed_v = closed(graph, v)
                a = independence_row(remove_vertices(graph, (u, v)), 7)
                b = independence_row(remove_vertices(graph, {u, *closed_v}), 6)
                c = independence_row(remove_vertices(graph, {v, *closed_u}), 6)
                d = independence_row(remove_vertices(graph, closed_u | closed_v), 6)
                no_parent = (
                    bilinear(a, a, A2_TERMS)
                    + bilinear(a, b, L2_TERMS)
                    + bilinear(a, c, L2_TERMS)
                    + bilinear(b, c, K2_TERMS)
                    + bilinear(a, d, K2_TERMS)
                )
                common_neighbors = len(set(graph.neighbors(u)) & set(graph.neighbors(v)))
                assert common_neighbors in (0, 1)
                connected = nx.has_path(graph, u, v)
                path = nx.shortest_path(graph, u, v) if connected else None

                for p in (node for node in nodes if node not in (u, v)):
                    d_e = independence_row(remove_vertices(graph, (p,)), 6)
                    d_u = independence_row(remove_vertices(graph, (p, u)), 6)
                    d_v = independence_row(remove_vertices(graph, (p, v)), 6)
                    d_w = independence_row(remove_vertices(graph, (p, u, v)), 6)
                    values = {f"a{rank}": a[rank] for rank in range(8)}
                    values.update({f"b{rank}": b[rank] for rank in range(7)})
                    values.update({f"c{rank}": c[rank] for rank in range(7)})
                    values.update({f"d{rank}": d[rank] for rank in range(7)})
                    for rank in range(2, 7):
                        dw = d_w[rank]
                        da = d_u[rank] - dw
                        db = d_v[rank] - dw
                        dz = d_e[rank] - d_u[rank] - d_v[rank] + dw
                        parent_loss = {
                            f"PW{rank}": a[rank] - dw,
                            f"PA{rank}": b[rank - 1] - da,
                            f"PB{rank}": c[rank - 1] - db,
                            f"PZ{rank}": d[rank - 2] - dz,
                        }
                        assert min(parent_loss.values()) >= 0
                        values.update(parent_loss)
                    correction = int(evaluate_correction(*(
                        values[str(symbol)] for symbol in arguments
                    )))
                    ordinary = no_parent + correction
                    epsilon_u = int(graph.has_edge(p, u))
                    epsilon_v = int(graph.has_edge(p, v))
                    on_spine = bool(path is not None and p in path[1:-1])
                    mode = (
                        f"common{common_neighbors}_adj{epsilon_u}{epsilon_v}_"
                        f"spine{int(on_spine)}"
                    )
                    row = classification.setdefault(mode, {
                        "common_neighbors": common_neighbors,
                        "parent_adjacent_u": epsilon_u,
                        "parent_adjacent_v": epsilon_v,
                        "parent_on_marked_spine": on_spine,
                        "records": 0,
                        "negative_ordinary_g2": 0,
                        "negative_transfer_corrections": 0,
                        "minimum_ordinary_g2": None,
                        "minimum_correction": None,
                    })
                    row["records"] += 1
                    row["negative_ordinary_g2"] += int(ordinary < 0)
                    row["negative_transfer_corrections"] += int(correction < 0)
                    row["minimum_ordinary_g2"] = (
                        ordinary if row["minimum_ordinary_g2"] is None else
                        min(row["minimum_ordinary_g2"], ordinary)
                    )
                    row["minimum_correction"] = (
                        correction if row["minimum_correction"] is None else
                        min(row["minimum_correction"], correction)
                    )

                    records += 1
                    negative += int(ordinary < 0)
                    negative_correction += int(correction < 0)
                    record = {
                        "ordinary_g2": ordinary,
                        "no_parent_g2": no_parent,
                        "correction": correction,
                        "marked_forest_order": marked_order,
                        "common_A_order": common_order,
                        "graph6": code,
                        "u": u,
                        "v": v,
                        "ordinary_parent_p": p,
                        "common_neighbors": common_neighbors,
                        "parent_adjacent_u": epsilon_u,
                        "parent_adjacent_v": epsilon_v,
                        "parent_on_marked_spine": on_spine,
                        "marked_distance": len(path) - 1 if path is not None else None,
                    }
                    stream.update(
                        f"{marked_order}|{code}|{u}|{v}|{p}|{no_parent}|"
                        f"{correction}|{ordinary}|{mode};".encode()
                    )
                    candidate = (ordinary, code, u, v, p)
                    if minimum is None or candidate < minimum:
                        minimum = candidate
                        witness = record
                    correction_candidate = (correction, code, u, v, p)
                    if correction_minimum is None or correction_candidate < correction_minimum:
                        correction_minimum = correction_candidate
                        correction_witness = record
        assert minimum is not None and correction_minimum is not None
        per_order[str(common_order)] = {
            "marked_forest_order": marked_order,
            "unlabeled_forests": forest_count,
            "unordered_nonedge_parent_triples": records,
            "negative_ordinary_g2": negative,
            "negative_transfer_corrections": negative_correction,
            "minimum_ordinary_g2": minimum[0],
            "minimum_correction": correction_minimum[0],
            "minimum_witness": witness,
            "minimum_correction_witness": correction_witness,
        }
        total_records += records
        total_negative += negative
        total_negative_correction += negative_correction
        candidate = (minimum[0], common_order)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = witness
        correction_candidate = (correction_minimum[0], common_order)
        if global_correction_minimum is None or correction_candidate < global_correction_minimum:
            global_correction_minimum = correction_candidate
            global_correction_witness = correction_witness
        print(
            f"AUDITED N={common_order} triples={records} ordinary_neg={negative} "
            f"correction_neg={negative_correction} min={minimum[0]} "
            f"delta_min={correction_minimum[0]}",
            flush=True,
        )

    marker = PASS_TOTAL if total_negative == 0 else FAIL
    report = {
        "marker": marker,
        "status": (
            "PASS exact nonadjacent ordinary-parent total g2 census"
            if total_negative == 0 else
            "literal nonadjacent ordinary-parent g2 counterexample"
        ),
        "theorem": (
            "For every nonadjacent marked forest with common order 1<=N<=8 "
            "and every ordinary parent p, g2(C,C-p)>=0."
            if total_negative == 0 else None
        ),
        "transfer_theorem": (
            "g2(C,C-p)>=g2(C,C)" if total_negative_correction == 0 else None
        ),
        "per_common_order": per_order,
        "classification": dict(sorted(classification.items())),
        "aggregate": {
            "unordered_nonedge_parent_triples": total_records,
            "negative_ordinary_g2": total_negative,
            "negative_transfer_corrections": total_negative_correction,
            "global_minimum_ordinary_g2": global_minimum[0],
            "global_minimum_correction": global_correction_minimum[0],
            "global_minimum_witness": global_witness,
            "global_minimum_correction_witness": global_correction_witness,
            "ordered_literal_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage": (
            "all unlabeled forests through order 10, every unordered nonedge uv, "
            "and every p distinct from u,v"
        ),
        "loss_report": {"file": LOSS.name, "sha256": LOSS_SHA256},
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": marker,
        "triples": total_records,
        "ordinary_negative": total_negative,
        "correction_negative": total_negative_correction,
        "minimum": global_minimum[0],
        "correction_minimum": global_correction_minimum[0],
        "classification_modes": len(classification),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
