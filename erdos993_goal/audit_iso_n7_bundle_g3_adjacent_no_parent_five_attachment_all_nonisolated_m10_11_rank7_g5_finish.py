#!/usr/bin/env python3
"""Exact finite m=10,11 audit for all-nonisolated five attachments."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_m10_11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_ALL_NONISOLATED_M10_11_RANK7_G5_FINISH"
DISTRIBUTIONS = {"5+0": (5, 0), "4+1": (4, 1), "3+2": (3, 2)}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def forest(order: int):
    if order == 10:
        components = [nx.path_graph(2) for _ in range(5)]
    elif order == 11:
        components = [nx.path_graph(3), *(nx.path_graph(2) for _ in range(4))]
    else:
        raise AssertionError(order)
    graph = nx.disjoint_union_all(components)
    vertex_components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
    return graph, vertex_components


def independent_masks(graph: nx.Graph):
    order = graph.number_of_nodes()
    edge_masks = [(1 << u) | (1 << v) for u, v in graph.edges()]
    rows = [0]*9
    masks = [[] for _ in range(8)]
    for mask in range(1 << order):
        if any(mask & edge_mask == edge_mask for edge_mask in edge_masks):
            continue
        rank = mask.bit_count()
        if rank <= 8:
            rows[rank] += 1
        if rank <= 7:
            masks[rank].append(mask)
    return rows, masks


def evaluator():
    assert sha256(INPUT) == INPUT_SHA
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b")
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    expression = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m,
        "a": a,
        "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    variables = (m, a, b, *(W[k] for k in range(2, 9)), *(P[k] for k in range(2, 8)), *(Q[k] for k in range(2, 8)))
    terms = sp.Poly(expression, *variables).terms()

    def evaluate(values):
        total = 0
        for powers, coefficient in terms:
            assert coefficient.q == 1
            term = int(coefficient)
            for value, power in zip(values, powers):
                term *= value**power
            total += term
        return total

    return expression, evaluate


def main() -> None:
    expression, evaluate = evaluator()
    stream = hashlib.sha256()
    reports = {}
    aggregate = negatives = 0
    global_minimum = None
    for order in (10, 11):
        graph, components = forest(order)
        rows, masks = independent_masks(graph)
        for label, (a, b) in DISTRIBUTIONS.items():
            checked = 0
            local_minimum = None
            witness = None
            for roots in itertools.product(*components):
                for y_components in itertools.combinations(range(5), b):
                    y_indices = set(y_components)
                    y_roots = tuple(roots[index] for index in y_components)
                    x_roots = tuple(roots[index] for index in range(5) if index not in y_indices)
                    p_bits = sum(1 << root for root in y_roots)
                    q_bits = sum(1 << root for root in x_roots)
                    p_rows = [0]*8
                    q_rows = [0]*8
                    for rank in range(2, 8):
                        p_rows[rank] = sum(bool(mask & p_bits) for mask in masks[rank])
                        q_rows[rank] = sum(bool(mask & q_bits) for mask in masks[rank])
                    value = evaluate([order, a, b, *rows[2:9], *p_rows[2:8], *q_rows[2:8]])
                    checked += 1
                    aggregate += 1
                    negatives += value < 0
                    stream.update(
                        f"{order}|{label}|{roots}|{y_components}|{rows[2:9]}|{p_rows[2:8]}|{q_rows[2:8]}|{value};".encode()
                    )
                    if local_minimum is None or value < local_minimum:
                        local_minimum = value
                        witness = {
                            "roots_by_component": roots,
                            "Y_component_indices": y_components,
                            "P2_through_P7": p_rows[2:8],
                            "Q2_through_Q7": q_rows[2:8],
                        }
            assert checked > 0 and local_minimum is not None and local_minimum >= 0
            global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)
            reports[f"m{order}_{label.replace('+','')}"] = {
                "instances": checked,
                "minimum": local_minimum,
                "minimum_witness": witness,
                "W2_through_W8": rows[2:9],
            }
    assert negatives == 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent no-parent G3 with exactly five all-nonisolated attachment roots in distinct components, every distribution passes at m=10,11 (n=12,13).",
        "exhaustive_structure": {
            "m10": "An isolate-free 10-vertex forest with five distinguished components is necessarily five disjoint K2 components.",
            "m11": "An isolate-free 11-vertex forest with five distinguished components is necessarily P3 plus four disjoint K2 components.",
            "root_and_side_choices": "Every root choice in every component and every side assignment of type 5+0, 4+1, or 3+2 is evaluated exactly; automorphic duplicates are retained.",
        },
        "case_reports": reports,
        "aggregate": {
            "rooted_side_instances": aggregate,
            "negative_count": negatives,
            "global_minimum": global_minimum,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "identity": str(expression),
        "coverage_gap_within_stated_m10_11_all_nonisolated_five_attachment_branch": None,
        "scope": "Exactly five attachments, all roots nonisolated in distinct components, W isolate-free, m=10,11; adjacent no-parent G3.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "cases": len(reports)}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
