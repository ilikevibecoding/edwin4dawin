#!/usr/bin/env python3
"""Exact small-forest audit of same-mark additions ending at >=6 roots.

This is deliberately a sign audit, not a monotonicity theorem.  It preserves
the exact attachment-increment identity and records the first negative witness
if the hoped-for >=6 stopping recurrence fails.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

import audit_iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_same_mark_small_rank7_g5_finish as base


HERE = Path(__file__).resolve().parent
BASE_SOURCE = HERE / "audit_iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_same_mark_small_rank7_g5_finish.py"
BASE_SOURCE_SHA = "0A4C13FFB50EDB028069A3CE7BC700549628A98425EF41EBDD0049F39E3B71A5"
IDENTITY = HERE / "iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_exact_rank7_g5_finish_20260831.json"
IDENTITY_SHA = "3D1F88C321875D63BCE0DE4021E49C7640C19E687237A5DFF2F9DDAA7333C3AB"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_same_mark_ge6_small_audit_rank7_g5_finish_20260831.json"
MARKER = "AUDIT_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ATTACHMENT_INCREMENT_SAME_MARK_GE6_SMALL_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=8, choices=range(6, 11))
    args = parser.parse_args()
    assert sha256(BASE_SOURCE) == BASE_SOURCE_SHA
    assert sha256(IDENTITY) == IDENTITY_SHA
    expression, evaluate = base.evaluator()
    stream = hashlib.sha256()
    aggregate = 0
    negative_count = 0
    global_minimum = None
    first_negative = None
    by_attachment_count: dict[str, dict] = {}
    order_reports = {}

    for order in range(6, args.max_order + 1):
        forest_count = rooted_count = 0
        local_minimum = None
        local_first_negative = None
        for forest_index, graph in enumerate(base.unlabeled_forests(order)):
            forest_count += 1
            components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
            if len(components) < 6:
                continue
            component_of = {
                vertex: index
                for index, component in enumerate(components)
                for vertex in component
            }
            rows, masks = base.independent_masks(graph)
            encoding = tuple(sorted(tuple(sorted(edge)) for edge in graph.edges()))
            for attachment_count in range(6, len(components) + 1):
                count_report = by_attachment_count.setdefault(
                    str(attachment_count),
                    {"instances": 0, "negative_count": 0, "minimum": None, "first_negative": None},
                )
                for roots in itertools.combinations(range(order), attachment_count):
                    if len({component_of[root] for root in roots}) != attachment_count:
                        continue
                    for new_root in roots:
                        old_roots = tuple(root for root in roots if root != new_root)
                        old_mask = sum(1 << root for root in old_roots)
                        new_bit = 1 << new_root
                        rooted_rows = [0] * 8
                        for rank in range(2, 8):
                            rooted_rows[rank] = sum(
                                bool(mask & new_bit) and not bool(mask & old_mask)
                                for mask in masks[rank]
                            )
                        values = [order, *rows[2:9], *rooted_rows[2:8]]
                        value = evaluate(values)
                        witness = {
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
                        aggregate += 1
                        rooted_count += 1
                        count_report["instances"] += 1
                        stream.update(
                            f"{order}|{forest_index}|{encoding}|{attachment_count}|{roots}|{new_root}|{rows[2:9]}|{rooted_rows[2:8]}|{value};".encode()
                        )
                        if local_minimum is None or value < local_minimum:
                            local_minimum = value
                        if count_report["minimum"] is None or value < count_report["minimum"]:
                            count_report["minimum"] = value
                        if value < 0:
                            negative_count += 1
                            count_report["negative_count"] += 1
                            if first_negative is None:
                                first_negative = witness
                            if local_first_negative is None:
                                local_first_negative = witness
                            if count_report["first_negative"] is None:
                                count_report["first_negative"] = witness
        if rooted_count:
            global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)
        order_reports[str(order)] = {
            "unlabeled_forests": forest_count,
            "rooted_add_one_instances": rooted_count,
            "minimum_increment": local_minimum,
            "first_negative": local_first_negative,
        }

    report = {
        "marker": MARKER,
        "status": "exact finite audit; no all-order sign theorem asserted",
        "same_mark_increment": str(expression),
        "orders": [6, args.max_order],
        "parameters": {"max_order": args.max_order},
        "order_reports": order_reports,
        "by_attachment_count_after": by_attachment_count,
        "aggregate": {
            "rooted_add_one_instances": aggregate,
            "negative_count": negative_count,
            "global_minimum": global_minimum,
            "first_negative": first_negative,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "dependencies": {
            BASE_SOURCE.name: BASE_SOURCE_SHA,
            IDENTITY.name: IDENTITY_SHA,
        },
        "scope": "Same-mark addition ending at >=6 roots, all roots in distinct forest components, W order 6..max-order.",
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
