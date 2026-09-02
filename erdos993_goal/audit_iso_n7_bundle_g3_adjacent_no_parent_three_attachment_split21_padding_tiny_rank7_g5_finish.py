#!/usr/bin/env python3
"""Exact tiny-base audits for split 2+1 three-attachment isolate padding."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_rank7_g5_finish import padding_coefficients


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_tiny_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT21_PADDING_TINY_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def unlabeled_forests(order: int):
    """Generate every unlabeled forest once as a multiset of free trees."""
    component_types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            component_types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining: int, start: int, selected: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([component_types[index][1] for index in selected])
            return
        for index in range(start, len(component_types)):
            size = component_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining-size, index, (*selected, index))

    yield from extend(order, 0, ())


def independent_masks(graph: nx.Graph):
    h = graph.number_of_nodes()
    edge_masks = [(1 << a) | (1 << b) for a, b in graph.edges()]
    rows = [0] * 9
    masks_by_rank = [[] for _ in range(8)]
    for mask in range(1 << h):
        if any(mask & edge_mask == edge_mask for edge_mask in edge_masks):
            continue
        rank = mask.bit_count()
        if rank <= 8:
            rows[rank] += 1
        if rank <= 7:
            masks_by_rank[rank].append(mask)
    return rows, masks_by_rank


def rooted_rows(masks_by_rank, p_root: int, q_roots: tuple[int, int]):
    p_bit = 1 << p_root
    q_bits = (1 << q_roots[0]) | (1 << q_roots[1])
    p_rows = [0] * 8
    q_rows = [0] * 8
    for rank in range(8):
        p_rows[rank] = sum(bool(mask & p_bit) for mask in masks_by_rank[rank])
        q_rows[rank] = sum(bool(mask & q_bits) for mask in masks_by_rank[rank])
    return p_rows, q_rows


def evaluator(expression, hsym, ivars, jpvars, jqvars):
    variables = [hsym, *(ivars[k] for k in range(2, 9)), *(jpvars[k] for k in range(2, 8)), *(jqvars[k] for k in range(2, 8))]
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

    return evaluate


def main() -> None:
    hsym, ivars, jpvars, jqvars, coefficients = padding_coefficients()
    evaluators = {index: evaluator(coefficients[index], hsym, ivars, jpvars, jqvars) for index in (1, 2)}
    stream = hashlib.sha256()
    order_reports = {}
    aggregate = negatives = 0
    global_minima = {1: None, 2: None}
    for h in range(3, 10):
        checked = forest_count = 0
        local_minima = {1: None, 2: None}
        witnesses = {1: None, 2: None}
        active_indices = (1, 2) if h == 3 else (1,)
        for forest_index, graph in enumerate(unlabeled_forests(h)):
            forest_count += 1
            independent, masks_by_rank = independent_masks(graph)
            components = {vertex: index for index, component in enumerate(nx.connected_components(graph)) for vertex in component}
            encoding = tuple(sorted(tuple(sorted(edge)) for edge in graph.edges()))
            for p_root in range(h):
                for q_roots in itertools.combinations((vertex for vertex in range(h) if vertex != p_root), 2):
                    if len({components[p_root], components[q_roots[0]], components[q_roots[1]]}) != 3:
                        continue
                    p_rows, q_rows = rooted_rows(masks_by_rank, p_root, q_roots)
                    assert p_rows[1] == 1 and q_rows[1] == 2
                    values = [h, *independent[2:9], *p_rows[2:8], *q_rows[2:8]]
                    checked += 1
                    for index in active_indices:
                        value = evaluators[index](values)
                        stream.update(f"H{index}|{h}|{forest_index}|{encoding}|{p_root}|{q_roots}|{independent[2:9]}|{p_rows[2:8]}|{q_rows[2:8]}|{value};".encode())
                        negatives += value < 0
                        if local_minima[index] is None or value < local_minima[index]:
                            local_minima[index] = value
                            witnesses[index] = {
                                "forest_index": forest_index,
                                "edges": encoding,
                                "P_root": p_root,
                                "Q_roots": q_roots,
                                "I2_through_I8": independent[2:9],
                                "JP2_through_JP7": p_rows[2:8],
                                "JQ2_through_JQ7": q_rows[2:8],
                            }
        assert checked > 0
        for index in active_indices:
            assert local_minima[index] is not None and local_minima[index] >= 0
            global_minima[index] = local_minima[index] if global_minima[index] is None else min(global_minima[index], local_minima[index])
        order_reports[str(h)] = {
            "base_order_h": h,
            "unlabeled_forests": forest_count,
            "ordered_P_unordered_Q_root_instances_in_three_distinct_components": checked,
            "indices_checked": list(active_indices),
            "minima": {str(index): local_minima[index] for index in active_indices},
            "minimum_witnesses": {str(index): witnesses[index] for index in active_indices},
        }
        aggregate += checked
    assert negatives == 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For split 2+1 roots in three distinct components, H1 is nonnegative on every forest base 3<=h<=9, and H2 is nonnegative at h=3.",
        "method": "Complete multiset-of-free-trees generation of every unlabeled forest, every choice of the P root, and every unordered Q-root pair; automorphic duplicates are retained.",
        "order_reports": order_reports,
        "aggregate": {
            "rooted_unlabeled_forest_instances_checked": aggregate,
            "negative_count": negatives,
            "global_minimum_H1": global_minima[1],
            "global_minimum_H2_h3": global_minima[2],
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "exact_coefficients": {"H1": str(coefficients[1]), "H2": str(coefficients[2])},
        "coverage_gap_within_tiny_padding_audit": None,
        "scope": "Split 2+1 exactly-three-attachment padding: H1 base h=3..9 and H2 base h=3 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "orders": [3, 9]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
