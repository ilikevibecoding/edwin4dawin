#!/usr/bin/env python3
"""Exact small-forest audit of the same-mark add-one-attachment increment."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "3D1F88C321875D63BCE0DE4021E49C7640C19E687237A5DFF2F9DDAA7333C3AB"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_same_mark_small_audit_rank7_g5_finish_20260831.json"
MARKER = "AUDIT_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ATTACHMENT_INCREMENT_SAME_MARK_SMALL_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def unlabeled_forests(order: int):
    component_types = []
    for size in range(1, order+1):
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
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    m = sp.Symbol("m")
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    R = {k: sp.Symbol(f"R{k}") for k in range(2, 8)}
    expression = sp.expand(sp.sympify(report["same_mark_increment_b0"], locals={
        "m": m,
        **{f"W{k}": W[k] for k in W},
        **{f"R{k}": R[k] for k in R},
    }))
    variables = (m, *(W[k] for k in range(2, 9)), *(R[k] for k in range(2, 8)))
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=10, choices=range(5, 11))
    args = parser.parse_args()
    expression, evaluate = evaluator()
    stream = hashlib.sha256()
    aggregate = 0
    negative_count = 0
    global_minimum = None
    first_negative = None
    order_reports = {}
    for order in range(5, args.max_order+1):
        forest_count = rooted_count = 0
        local_minimum = None
        local_witness = None
        for forest_index, graph in enumerate(unlabeled_forests(order)):
            forest_count += 1
            components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
            if len(components) < 5:
                continue
            component_of = {vertex: index for index, component in enumerate(components) for vertex in component}
            rows, masks = independent_masks(graph)
            encoding = tuple(sorted(tuple(sorted(edge)) for edge in graph.edges()))
            for attachment_count in range(5, len(components)+1):
                for roots in itertools.combinations(range(order), attachment_count):
                    if len({component_of[root] for root in roots}) != attachment_count:
                        continue
                    for new_root in roots:
                        old_roots = tuple(root for root in roots if root != new_root)
                        old_mask = sum(1 << root for root in old_roots)
                        new_bit = 1 << new_root
                        rooted_rows = [0]*8
                        for rank in range(2, 8):
                            rooted_rows[rank] = sum(
                                bool(mask & new_bit) and not bool(mask & old_mask)
                                for mask in masks[rank]
                            )
                        values = [order, *rows[2:9], *rooted_rows[2:8]]
                        value = evaluate(values)
                        rooted_count += 1
                        aggregate += 1
                        stream.update(
                            f"{order}|{forest_index}|{encoding}|{attachment_count}|{roots}|{new_root}|{rows[2:9]}|{rooted_rows[2:8]}|{value};".encode()
                        )
                        if value < 0:
                            negative_count += 1
                            if first_negative is None:
                                first_negative = {
                                    "order": order,
                                    "forest_index": forest_index,
                                    "edges": encoding,
                                    "attachment_count_after": attachment_count,
                                    "roots_after": roots,
                                    "new_root": new_root,
                                    "W2_through_W8": rows[2:9],
                                    "R2_through_R7": rooted_rows[2:8],
                                    "increment": value,
                                }
                        if local_minimum is None or value < local_minimum:
                            local_minimum = value
                            local_witness = {
                                "forest_index": forest_index,
                                "edges": encoding,
                                "attachment_count_after": attachment_count,
                                "roots_after": roots,
                                "new_root": new_root,
                                "W2_through_W8": rows[2:9],
                                "R2_through_R7": rooted_rows[2:8],
                            }
        if rooted_count:
            global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)
        order_reports[str(order)] = {
            "unlabeled_forests": forest_count,
            "rooted_add_one_instances": rooted_count,
            "minimum_increment": local_minimum,
            "minimum_witness": local_witness,
        }
    report = {
        "marker": MARKER,
        "status": "exact finite audit; no all-order sign theorem asserted",
        "same_mark_increment": str(expression),
        "orders": [5, args.max_order],
        "order_reports": order_reports,
        "aggregate": {
            "rooted_add_one_instances": aggregate,
            "negative_count": negative_count,
            "global_minimum": global_minimum,
            "first_negative": first_negative,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "scope": "Same-mark addition from at least four old roots, all roots in distinct forest components, W order 5..10.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
