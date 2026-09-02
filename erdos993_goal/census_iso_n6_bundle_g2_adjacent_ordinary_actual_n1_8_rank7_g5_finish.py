#!/usr/bin/env python3
"""Literal adjacent ordinary-parent census for common orders N=1..8."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from census_iso_n6_bundle_g2_adjacent_actual_n0_8_root import bilinear, graph6, independence_row, remove_closed_neighborhood
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS, K2_TERMS, L2_TERMS
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_actual_n1_8_exact_rank7_g5_finish_20260831.json"
PASS_TRANSFER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_TRANSFER_N1_8_RANK7_G5_FINISH"
PASS_TOTAL = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_TOTAL_N1_8_RANK7_G5_FINISH"
FAIL = "COUNTEREXAMPLE_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_TOTAL_N1_8_RANK7_G5_FINISH"
LOSS = HERE / "iso_n6_bundle_g2_adjacent_ordinary_parent_loss_exact_rank7_g5_finish_20260831.json"
LOSS_SHA256 = "DCEDB94D866F61E6E0CEC1F36346D65388642F1CA9FA7B0E700C5C05D0D654DA"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def remove_vertices(graph, vertices):
    reduced = graph.copy()
    reduced.remove_nodes_from(vertices)
    return reduced


def main():
    assert sha256(LOSS) == LOSS_SHA256
    loss = json.loads(LOSS.read_text(encoding="utf-8"))
    assert loss["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT_LOSS_RANK7_G5_FINISH"
    local = {}
    for prefix, stop in (("a", 8), ("b", 7), ("c", 7)):
        for rank in range(stop):
            local[f"{prefix}{rank}"] = sp.Symbol(f"{prefix}{rank}")
    for label in loss["active_parent_loss_variables"]:
        local[label] = sp.Symbol(label)
    correction_expr = sp.sympify(loss["correction"], locals=local)
    arguments = tuple(sorted(correction_expr.free_symbols, key=str))
    evaluate_correction = sp.lambdify(arguments, correction_expr, "math")

    per_order = {}
    total_records = total_negative = total_negative_correction = 0
    global_minimum = global_correction_minimum = None
    global_witness = global_correction_witness = None
    stream = hashlib.sha256()
    for marked_order in range(3, 11):
        common_order = marked_order-2
        records = negative = negative_correction = 0
        minimum = correction_minimum = None
        witness = correction_witness = None
        forest_count = 0
        for graph0 in forest_graphs(marked_order):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            code = graph6(graph)
            for left, right in sorted(tuple(sorted(edge)) for edge in graph.edges()):
                for u, v in ((left, right), (right, left)):
                    common = remove_vertices(graph, (u, v))
                    a = independence_row(common, 7)
                    b = independence_row(remove_closed_neighborhood(graph, v), 6)
                    c = independence_row(remove_closed_neighborhood(graph, u), 6)
                    no_parent = (
                        bilinear(a, a, A2_TERMS)
                        + bilinear(a, b, L2_TERMS)
                        + bilinear(a, c, L2_TERMS)
                        + bilinear(b, c, K2_TERMS)
                    )
                    for p in sorted(set(graph)-{u, v}):
                        d_e = independence_row(remove_vertices(graph, (p,)), 6)
                        d_u = independence_row(remove_vertices(graph, (p, u)), 6)
                        d_v = independence_row(remove_vertices(graph, (p, v)), 6)
                        d_w = independence_row(remove_vertices(graph, (p, u, v)), 6)
                        values = {f"a{rank}": a[rank] for rank in range(8)}
                        values.update({f"b{rank}": b[rank] for rank in range(7)})
                        values.update({f"c{rank}": c[rank] for rank in range(7)})
                        for rank in range(2, 7):
                            dw = d_w[rank]
                            da = d_u[rank]-dw
                            db = d_v[rank]-dw
                            dz = d_e[rank]-d_u[rank]-d_v[rank]+dw
                            assert dz == 0
                            values[f"PW{rank}"] = a[rank]-dw
                            values[f"PA{rank}"] = b[rank-1]-da
                            values[f"PB{rank}"] = c[rank-1]-db
                            assert min(values[f"PW{rank}"], values[f"PA{rank}"], values[f"PB{rank}"]) >= 0
                        correction = int(evaluate_correction(*(values[str(symbol)] for symbol in arguments)))
                        ordinary = no_parent+correction
                        records += 1
                        negative += int(ordinary < 0)
                        negative_correction += int(correction < 0)
                        record = {
                            "ordinary_g2": ordinary, "no_parent_g2": no_parent, "correction": correction,
                            "marked_forest_order": marked_order, "common_A_order": common_order,
                            "graph6": code, "u": u, "v": v, "ordinary_parent_p": p,
                        }
                        stream.update(f"{marked_order}|{code}|{u}|{v}|{p}|{no_parent}|{correction}|{ordinary};".encode())
                        candidate = (ordinary, code, u, v, p)
                        if minimum is None or candidate < minimum:
                            minimum = candidate
                            witness = record
                        correction_candidate = (correction, code, u, v, p)
                        if correction_minimum is None or correction_candidate < correction_minimum:
                            correction_minimum = correction_candidate
                            correction_witness = record
        assert minimum is not None and correction_minimum is not None
        assert negative == 0
        per_order[str(common_order)] = {
            "marked_forest_order": marked_order,
            "unlabeled_forests": forest_count,
            "oriented_edge_parent_triples": records,
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
        print(f"AUDITED N={common_order} triples={records} ordinary_neg={negative} correction_neg={negative_correction} min={minimum[0]} delta_min={correction_minimum[0]}", flush=True)

    marker = PASS_TRANSFER if total_negative_correction == 0 else PASS_TOTAL if total_negative == 0 else FAIL
    report = {
        "marker": marker,
        "status": (
            "PASS exact ordinary-parent-to-no-parent transfer census" if marker == PASS_TRANSFER
            else "PASS total g2 only; monotone transfer has literal counterexamples" if marker == PASS_TOTAL
            else "literal ordinary-parent g2 counterexample"
        ),
        "theorem": (
            "For every adjacent marked forest with common order 1<=N<=8 and every ordinary parent p, g2(C,C-p)>=0."
            if total_negative == 0 else None
        ),
        "transfer_theorem": (
            "For the same scope, g2(C,C-p)>=g2(C,C)." if total_negative_correction == 0 else None
        ),
        "per_common_order": per_order,
        "aggregate": {
            "oriented_edge_parent_triples": total_records,
            "negative_ordinary_g2": total_negative,
            "negative_transfer_corrections": total_negative_correction,
            "global_minimum_ordinary_g2": global_minimum[0],
            "global_minimum_correction": global_correction_minimum[0],
            "global_minimum_witness": global_witness,
            "global_minimum_correction_witness": global_correction_witness,
            "ordered_literal_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage": "all unlabeled forests through order 10, both orientations of every edge uv, every p distinct from u,v",
        "loss_report": {"file": LOSS.name, "sha256": LOSS_SHA256},
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": marker, "triples": total_records, "ordinary_negative": total_negative, "correction_negative": total_negative_correction, "minimum": global_minimum[0], "correction_minimum": global_correction_minimum[0]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
