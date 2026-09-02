#!/usr/bin/env python3
"""Exact exhaustive rank-seven G1/G2/G3 census for forest orders 8..10.

Every unlabeled forest is generated once, every ordered marked geometry is
represented by an unordered distinct pair, and the canonical deepest bundle
cell is evaluated by the literal telescope at bundle sizes M=0,1,2,3.  This
is a finite certificate only.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import json
from pathlib import Path

import networkx as nx

from assemble_iso_all_forest_n4_bundle_induction_root import (
    add_isolates,
    add_leaves,
    binomial_coefficients,
    classify_deepest_support,
    deepest_eligible_support,
    rank_value,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import (
    forest_graphs,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g123_finite_n8_10_exact_rank7_g4_piecewise_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N8_10_RANK7_G4_PIECEWISE"
HELPER = HERE / "assemble_iso_all_forest_n4_bundle_induction_root.py"
HELPER_SHA256 = (
    "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720"
)
FOREST_HELPER = HERE / "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py"
FOREST_HELPER_SHA256 = (
    "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def graph6(graph: nx.Graph) -> str:
    canonical = nx.convert_node_labels_to_integers(graph, ordering="sorted")
    return nx.to_graph6_bytes(canonical, header=False).decode().strip()


def first_three_coefficients(base: nx.Graph, support: int,
                             u: int, v: int) -> list[int]:
    c_graph = base.copy()
    c_graph.remove_node(support)
    base_value = rank_value(base, u, v, 7)
    gamma = []
    for bundle_size in range(4):
        bundled = add_leaves(base, support, bundle_size)
        payment = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 6)
            for isolates in range(bundle_size)
        )
        gamma.append(rank_value(bundled, u, v, 7) - base_value - payment)
    coefficients = binomial_coefficients(gamma)
    assert len(coefficients) == 4 and coefficients[0] == 0
    return coefficients


def witness(graph: nx.Graph, u: int, v: int, cell: dict,
            mode: str, index: int, value: int) -> dict:
    return {
        "value": value,
        "order": len(graph),
        "mode": mode,
        "coefficient": f"g{index}",
        "u": int(u),
        "v": int(v),
        "support": int(cell["support"]),
        "bundle_size": len(cell["bundle"]),
        "graph6": graph6(graph),
    }


def main() -> None:
    assert sha256(HELPER) == HELPER_SHA256
    assert sha256(FOREST_HELPER) == FOREST_HELPER_SHA256
    stream = hashlib.sha256()
    order_rows = []
    global_minima = {index: None for index in (1, 2, 3)}
    global_mode_counts = Counter()
    negatives = []

    for order in range(8, 11):
        forest_count = marked_pairs = bundle_cells = terminal_cells = 0
        mode_counts = Counter()
        minima = {index: None for index in (1, 2, 3)}
        for graph0 in forest_graphs(order):
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            forest_count += 1
            code = graph6(graph)
            for u in range(order):
                for v in range(u + 1, order):
                    marked_pairs += 1
                    cell = deepest_eligible_support(graph, u, v)
                    if cell is None:
                        terminal_cells += 1
                        continue
                    classification = classify_deepest_support(graph, u, v, cell)
                    mode = classification["mode"]
                    mode_counts[mode] += 1
                    global_mode_counts[mode] += 1
                    bundle_cells += 1
                    base = graph.copy()
                    base.remove_nodes_from(cell["bundle"])
                    coefficients = first_three_coefficients(
                        base, cell["support"], u, v
                    )
                    stream.update(
                        f"{order}:{code}:{u}:{v}:{cell['support']}:"
                        f"{','.join(map(str, cell['bundle']))}:{mode}:"
                        f"{coefficients[1]}:{coefficients[2]}:"
                        f"{coefficients[3]};".encode()
                    )
                    for index in (1, 2, 3):
                        item = witness(
                            graph, u, v, cell, mode, index, coefficients[index]
                        )
                        if minima[index] is None or item["value"] < minima[index]["value"]:
                            minima[index] = item
                        if (
                            global_minima[index] is None
                            or item["value"] < global_minima[index]["value"]
                        ):
                            global_minima[index] = item
                        if item["value"] < 0:
                            negatives.append(item)
        row = {
            "order": order,
            "unlabeled_forests": forest_count,
            "marked_pairs": marked_pairs,
            "bundle_cells": bundle_cells,
            "terminal_cells": terminal_cells,
            "mode_counts": dict(sorted(mode_counts.items())),
            "minima": {f"g{index}": minima[index] for index in (1, 2, 3)},
        }
        order_rows.append(row)
        print(json.dumps({
            "order": order,
            "forests": forest_count,
            "bundle_cells": bundle_cells,
            "terminal_cells": terminal_cells,
            "minima": {
                f"g{index}": minima[index]["value"] for index in (1, 2, 3)
            },
        }, sort_keys=True), flush=True)

    assert not negatives, negatives[:3]
    report = {
        "marker": MARKER,
        "status": "proved exact finite exhaustion",
        "theorem": (
            "For every forest C of order 8, 9, or 10, every ordered pair of "
            "distinct marks, and its canonical deepest eligible bundle cell, "
            "the literal rank-seven coefficients G1,G2,G3 are nonnegative."
        ),
        "orders": order_rows,
        "total_unlabeled_forests": sum(row["unlabeled_forests"] for row in order_rows),
        "total_marked_pairs": sum(row["marked_pairs"] for row in order_rows),
        "total_bundle_cells": sum(row["bundle_cells"] for row in order_rows),
        "total_terminal_cells": sum(row["terminal_cells"] for row in order_rows),
        "mode_counts": dict(sorted(global_mode_counts.items())),
        "global_minima": {
            f"g{index}": global_minima[index] for index in (1, 2, 3)
        },
        "negative_count": 0,
        "ordered_case_stream_sha256": stream.hexdigest().upper(),
        "dependencies_sha256": {
            HELPER.name: HELPER_SHA256,
            FOREST_HELPER.name: FOREST_HELPER_SHA256,
        },
        "scope": (
            "Exact finite orders 8..10 only; terminal cells, large orders, "
            "universal rank-seven bundle signs, all-N7, and Erdos Problem 993 "
            "are not promoted by this certificate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_count": 0,
        "total_bundle_cells": report["total_bundle_cells"],
        "global_minima": {
            key: value["value"] for key, value in report["global_minima"].items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
