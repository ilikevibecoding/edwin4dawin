#!/usr/bin/env python3
"""Exact small-forest audit of unrelated-isolate padding with >=6 roots."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

import audit_iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_same_mark_small_rank7_g5_finish as forests


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_unrelated_isolate_increment_general_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "1E7F6DB20048AD8CDF0C0BA9C8D9FD9DBADC5991B12AA7024B3A9C1232691E12"
FOREST_SOURCE = HERE / "audit_iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_same_mark_small_rank7_g5_finish.py"
FOREST_SOURCE_SHA = "0A4C13FFB50EDB028069A3CE7BC700549628A98425EF41EBDD0049F39E3B71A5"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_unrelated_isolate_increment_ge6_small_audit_rank7_g5_finish_20260831.json"
MARKER = "AUDIT_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_UNRELATED_ISOLATE_INCREMENT_GE6_SMALL_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def evaluator():
    assert sha256(INPUT) == INPUT_SHA
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    h, a, b = sp.symbols("h a b")
    I = {k: sp.Symbol(f"I{k}") for k in range(2, 9)}
    R = {k: sp.Symbol(f"R{k}") for k in range(2, 8)}
    S = {k: sp.Symbol(f"S{k}") for k in range(2, 8)}
    variables = (h, a, b, *(I[k] for k in range(2, 9)), *(R[k] for k in range(2, 8)), *(S[k] for k in range(2, 8)))
    expression = sp.expand(sp.sympify(report["increment"], locals={
        "h": h, "a": a, "b": b,
        **{f"I{k}": I[k] for k in I},
        **{f"R{k}": R[k] for k in R},
        **{f"S{k}": S[k] for k in S},
    }))
    terms = sp.Poly(expression, *variables).terms()

    def evaluate(values):
        total = 0
        for powers, coefficient in terms:
            assert coefficient.q == 1
            term = int(coefficient)
            for value, power in zip(values, powers):
                term *= value ** power
            total += term
        return total

    return expression, evaluate


def main() -> None:
    assert sha256(FOREST_SOURCE) == FOREST_SOURCE_SHA
    expression, evaluate = evaluator()
    stream = hashlib.sha256()
    aggregate = negative_count = 0
    global_minimum = None
    first_negative = None
    by_distribution = {}
    order_reports = {}
    for order in range(6, 9):
        forest_count = instance_count = 0
        local_minimum = None
        for forest_index, graph in enumerate(forests.unlabeled_forests(order)):
            forest_count += 1
            components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
            if len(components) < 6:
                continue
            rows, masks = forests.independent_masks(graph)
            encoding = tuple(sorted(tuple(sorted(edge)) for edge in graph.edges()))
            for root_count in range(6, len(components) + 1):
                for selected_components in itertools.combinations(range(len(components)), root_count):
                    selected_vertex_sets = [components[index] for index in selected_components]
                    for roots in itertools.product(*selected_vertex_sets):
                        for b_count in range(0, root_count // 2 + 1):
                            a_count = root_count - b_count
                            for y_roots in itertools.combinations(roots, b_count):
                                y_set = set(y_roots)
                                x_roots = tuple(root for root in roots if root not in y_set)
                                x_mask = sum(1 << root for root in x_roots)
                                y_mask = sum(1 << root for root in y_roots)
                                R = [0] * 8
                                S = [0] * 8
                                for rank in range(2, 8):
                                    R[rank] = sum(bool(mask & y_mask) for mask in masks[rank])
                                    S[rank] = sum(bool(mask & x_mask) for mask in masks[rank])
                                value = evaluate([order, a_count, b_count, *rows[2:9], *R[2:8], *S[2:8]])
                                witness = {
                                    "order": order,
                                    "forest_index": forest_index,
                                    "edges": encoding,
                                    "distribution": [a_count, b_count],
                                    "X_roots": x_roots,
                                    "Y_roots": y_roots,
                                    "I2_through_I8": rows[2:9],
                                    "R2_through_R7": R[2:8],
                                    "S2_through_S7": S[2:8],
                                    "increment": value,
                                }
                                key = f"{a_count}+{b_count}"
                                item = by_distribution.setdefault(key, {"instances": 0, "negative_count": 0, "minimum": None, "first_negative": None})
                                aggregate += 1
                                instance_count += 1
                                item["instances"] += 1
                                stream.update(f"{order}|{forest_index}|{encoding}|{a_count}|{b_count}|{x_roots}|{y_roots}|{rows[2:9]}|{R[2:8]}|{S[2:8]}|{value};".encode())
                                local_minimum = value if local_minimum is None else min(local_minimum, value)
                                global_minimum = value if global_minimum is None else min(global_minimum, value)
                                item["minimum"] = value if item["minimum"] is None else min(item["minimum"], value)
                                if value < 0:
                                    negative_count += 1
                                    item["negative_count"] += 1
                                    if first_negative is None:
                                        first_negative = witness
                                    if item["first_negative"] is None:
                                        item["first_negative"] = witness
        order_reports[str(order)] = {
            "unlabeled_forests": forest_count,
            "rooted_distribution_instances": instance_count,
            "minimum_increment": local_minimum,
        }
    report = {
        "marker": MARKER,
        "status": "exact finite audit; no all-order sign theorem asserted",
        "increment": str(expression),
        "orders": [6, 8],
        "order_reports": order_reports,
        "by_distribution": by_distribution,
        "aggregate": {
            "instances": aggregate,
            "negative_count": negative_count,
            "global_minimum": global_minimum,
            "first_negative": first_negative,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "dependencies": {INPUT.name: INPUT_SHA, FOREST_SOURCE.name: FOREST_SOURCE_SHA},
        "scope": "One unrelated-isolate increment, all symmetry-canonical distributions a>=b with a+b>=6, roots in distinct forest components, base order 6..8.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
