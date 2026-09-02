#!/usr/bin/env python3
"""Exact bounded audit of a possible leaf-edge induction for rank-seven G3.

For every isolate-free unlabeled forest core with one through five edges, every
leaf edge, and every admissible placement of at most one attachment root per
component, compare G3 before and after deleting that leaf edge while retaining
the resulting isolated vertex or vertices.  Extra attachment roots and
unrelated vertices are represented by actual isolates.  This is a bounded
obstruction search only; a passing report is not promoted as a theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx
import sympy as sp

import audit_iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_same_mark_small_rank7_g5_finish as forest_enum
from prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_three_edges_all_distributions_rank7_g5_finish import independent_counts


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_leaf_edge_deletion_monotonicity_small_audit_root_20260831.json"
MARKER = "AUDIT_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_LEAF_EDGE_DELETION_MONOTONICITY_SMALL_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolve(rows: tuple[int, ...], isolates: int, max_rank: int = 8) -> tuple[int, ...]:
    assert isolates >= 0
    return tuple(sum(
        rows[j] * math.comb(isolates, rank - j)
        for j in range(min(rank, len(rows) - 1) + 1)
        if 0 <= rank - j <= isolates
    ) for rank in range(max_rank + 1))


def compile_identity(identity_text: str):
    m, a, b = sp.symbols("m a b", nonnegative=True)
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    variables = (m, a, b, *(W[k] for k in W), *(P[k] for k in P), *(Q[k] for k in Q))
    identity = sp.Poly(sp.sympify(identity_text, locals={
        "m": m, "a": a, "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }), *variables)
    terms = tuple((powers, int(coefficient)) for powers, coefficient in identity.terms())

    def evaluate(values: tuple[int, ...]) -> int:
        assert len(values) == len(variables)
        total = 0
        for powers, coefficient in terms:
            product = coefficient
            for value, power in zip(values, powers):
                if power:
                    product *= value ** power
            total += product
        return total

    return evaluate, len(terms)


def isolate_free_cores(edge_count: int):
    cores = []
    for order in range(2, 2 * edge_count + 1):
        for graph in forest_enum.unlabeled_forests(order):
            if graph.number_of_edges() != edge_count:
                continue
            if any(graph.degree(vertex) == 0 for vertex in graph):
                continue
            cores.append(nx.convert_node_labels_to_integers(graph))
    return cores


def raw_root_patterns(graph: nx.Graph):
    option_sets = []
    for component in nx.connected_components(graph):
        component = tuple(sorted(component))
        options = [(None, None)]
        for vertex in component:
            options.extend(((vertex, "X"), (vertex, "Y")))
        option_sets.append(options)
    for choices in itertools.product(*option_sets):
        x_vertices = tuple(sorted(vertex for vertex, side in choices if side == "X"))
        y_vertices = tuple(sorted(vertex for vertex, side in choices if side == "Y"))
        yield x_vertices, y_vertices


def deleted_rows(graph: nx.Graph, removed: tuple[int, ...]) -> tuple[int, ...]:
    reduced = graph.copy()
    reduced.remove_nodes_from(removed)
    return independent_counts(reduced)


def row_signature(graph: nx.Graph, edge: tuple[int, int], x_vertices, y_vertices):
    cut = graph.copy()
    cut.remove_edge(*edge)
    return (
        len(x_vertices), len(y_vertices),
        independent_counts(graph),
        deleted_rows(graph, x_vertices), deleted_rows(graph, y_vertices),
        independent_counts(cut),
        deleted_rows(cut, x_vertices), deleted_rows(cut, y_vertices),
    ), cut


def value_for_rows(evaluate, full_rows, avoid_x_rows, avoid_y_rows,
                   core_order, x_count, y_count, a, b, unrelated):
    root_isolates = (a - x_count) + (b - y_count)
    isolates = root_isolates + unrelated
    m = core_order + isolates
    w = convolve(full_rows, isolates)
    avoiding_y = convolve(avoid_y_rows, isolates - (b - y_count))
    avoiding_x = convolve(avoid_x_rows, isolates - (a - x_count))
    p = tuple(w[k] - avoiding_y[k] for k in range(9))
    q = tuple(w[k] - avoiding_x[k] for k in range(9))
    values = (
        m, a, b,
        *(w[k] for k in range(2, 9)),
        *(p[k] for k in range(2, 8)),
        *(q[k] for k in range(2, 8)),
    )
    return evaluate(values)


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    evaluate, identity_term_count = compile_identity(upstream["identity"])
    total_raw_operations = 0
    total_signatures = 0
    parameter_cases = 0
    negative_differences = []
    negative_values = []
    minimum_difference = None
    minimum_value = None
    per_edge_count = {}

    for edge_count in range(1, 6):
        cores = isolate_free_cores(edge_count)
        signatures = {}
        for core_index, graph in enumerate(cores):
            leaf_edges = tuple(sorted(tuple(sorted(edge)) for edge in graph.edges()
                                      if graph.degree(edge[0]) == 1 or graph.degree(edge[1]) == 1))
            assert leaf_edges
            for x_vertices, y_vertices in raw_root_patterns(graph):
                for edge in leaf_edges:
                    total_raw_operations += 1
                    signature, cut = row_signature(graph, edge, x_vertices, y_vertices)
                    signatures.setdefault(signature, {
                        "core_index": core_index,
                        "core_order": graph.number_of_nodes(),
                        "core_edges": tuple(sorted(tuple(sorted(item)) for item in graph.edges())),
                        "leaf_edge": edge,
                        "X_core_vertices": x_vertices,
                        "Y_core_vertices": y_vertices,
                    })
        total_signatures += len(signatures)
        local_minimum_difference = None
        local_negative_differences = 0
        local_negative_values = 0
        for signature, witness in signatures.items():
            (x_count, y_count, full_rows, avoid_x_rows, avoid_y_rows,
             cut_rows, cut_avoid_x_rows, cut_avoid_y_rows) = signature
            core_order = witness["core_order"]
            for roots in range(6, 10):
                for b in range(roots // 2 + 1):
                    a = roots - b
                    if a < x_count or b < y_count:
                        continue
                    for unrelated in range(3):
                        parameter_cases += 1
                        before = value_for_rows(
                            evaluate, full_rows, avoid_x_rows, avoid_y_rows,
                            core_order, x_count, y_count, a, b, unrelated,
                        )
                        after = value_for_rows(
                            evaluate, cut_rows, cut_avoid_x_rows, cut_avoid_y_rows,
                            core_order, x_count, y_count, a, b, unrelated,
                        )
                        difference = before - after
                        minimum_difference = difference if minimum_difference is None else min(minimum_difference, difference)
                        minimum_value = before if minimum_value is None else min(minimum_value, before)
                        local_minimum_difference = difference if local_minimum_difference is None else min(local_minimum_difference, difference)
                        if difference < 0:
                            local_negative_differences += 1
                            if len(negative_differences) < 20:
                                negative_differences.append({
                                    **witness, "a": a, "b": b,
                                    "unrelated_isolates": unrelated,
                                    "G3_with_leaf_edge": before,
                                    "G3_after_edge_deletion": after,
                                    "difference": difference,
                                })
                        if before < 0:
                            local_negative_values += 1
                            if len(negative_values) < 20:
                                negative_values.append({
                                    **witness, "a": a, "b": b,
                                    "unrelated_isolates": unrelated,
                                    "G3": before,
                                })
        per_edge_count[str(edge_count)] = {
            "isolate_free_unlabeled_cores": len(cores),
            "deduplicated_leaf_root_signatures": len(signatures),
            "minimum_leaf_edge_minus_deleted_edge": local_minimum_difference,
            "negative_difference_cases": local_negative_differences,
            "negative_G3_cases": local_negative_values,
        }

    report = {
        "marker": MARKER,
        "status": "bounded exact audit; no theorem asserted",
        "identity_terms": identity_term_count,
        "range": {
            "edge_counts": [1, 2, 3, 4, 5],
            "attachment_roots": [6, 7, 8, 9],
            "unrelated_isolates": [0, 1, 2],
            "attachment_distribution": "all a>=b compatible with the rooted core pattern",
        },
        "raw_leaf_root_operations": total_raw_operations,
        "deduplicated_signatures": total_signatures,
        "parameter_cases": parameter_cases,
        "minimum_leaf_edge_minus_deleted_edge": minimum_difference,
        "minimum_G3_with_leaf_edge": minimum_value,
        "negative_difference_count": sum(item["negative_difference_cases"] for item in per_edge_count.values()),
        "negative_G3_count": sum(item["negative_G3_cases"] for item in per_edge_count.values()),
        "first_negative_differences": negative_differences,
        "first_negative_G3_values": negative_values,
        "per_edge_count": per_edge_count,
        "scope_guard": (
            "A negative difference disproves simple leaf-edge-deletion monotonicity only. "
            "A passing finite audit does not prove the unbounded induction."
        ),
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "parameter_cases": parameter_cases,
        "minimum_difference": minimum_difference,
        "negative_difference_count": report["negative_difference_count"],
        "minimum_G3": minimum_value,
        "negative_G3_count": report["negative_G3_count"],
        "per_edge_count": per_edge_count,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
