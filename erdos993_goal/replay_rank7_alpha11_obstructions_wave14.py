#!/usr/bin/env python3
"""Exact rank-seven alpha(B)=11 obstruction replay through |B|=20.

This independently regenerates every forest independence polynomial through
order 19 and streams every connected and disconnected order-20 forest.  It
finds every row with alpha(B)=11 and V7(B)<0.  All such rows turn out to be
connected, so every pendant reconstruction has C=B or C=I(B-v).  Every such
actual reconstruction is then checked in the coupled rank-seven identity.

Orders 21 and 22 of B are not covered; the output is finite evidence and an
explicit partial boundary classification, not an all-order theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from replay_rank7_pgc_census_wave14 import coeff, h, q7, rational, v7
from replay_rank6_component_pgc_boundary import (
    forest_polynomial,
    graph6,
    pendant_polynomial,
    tree_polynomial,
)


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent
DEFAULT_REPORT = ROOT / "rank7_alpha11_obstructions_wave14_exact_20260813.json"
EXPECTED_TREE_COUNTS = (
    1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159,
    7741, 19320, 48629, 123867, 317955, 823065,
)
EXPECTED_FOREST_COUNTS_THROUGH_19 = (
    1, 2, 3, 6, 10, 20, 36, 73, 142, 294, 618, 1348, 2974,
    6777, 15739, 37524, 90965, 224562, 561475,
)


def multiply(left: Polynomial, right: Polynomial) -> Polynomial:
    return tuple(int(value) for value in Poly(list(left)) * Poly(list(right)))


def components(poly: Polynomial) -> int:
    order = coeff(poly, 1)
    return order - comb(order, 2) + coeff(poly, 2)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()
    started = time.perf_counter()

    tree_sets: list[set[Polynomial]] = [set() for _ in range(20)]
    tree_sets[1].add((1, 1))
    tree_counts: list[int] = [0] * 21
    tree_counts[1] = 1
    rooted: dict[Polynomial, dict[str, object]] = {}

    def inspect_tree(tree: nx.Graph, order: int, poly: Polynomial) -> None:
        if len(poly) - 1 != 11 or v7(poly) >= 0:
            return
        record = rooted.setdefault(poly, {
            "order": order,
            "V7": v7(poly),
            "tree_realizations": 0,
            "root_occurrences": 0,
            "first_graph6": graph6(tree),
            "states": {},
        })
        record["tree_realizations"] = int(record["tree_realizations"]) + 1
        for vertex in tree.nodes:
            reduced = tree.copy()
            reduced.remove_node(vertex)
            deletion = forest_polynomial(reduced)
            record["root_occurrences"] = int(record["root_occurrences"]) + 1
            states = record["states"]
            states.setdefault(deletion, {
                "mode": "support_attached_to_vertex",
                "graph6": graph6(tree),
                "vertex": int(vertex),
            })

    for order in range(2, 20):
        current: set[Polynomial] = set()
        for tree in nx.nonisomorphic_trees(order):
            tree_counts[order] += 1
            poly = tree_polynomial(tree)
            current.add(poly)
            inspect_tree(tree, order, poly)
        assert tree_counts[order] == EXPECTED_TREE_COUNTS[order - 1]
        tree_sets[order] = current
        print(
            f"trees order={order} unlabeled={tree_counts[order]} "
            f"polynomials={len(current)}",
            flush=True,
        )

    forests: list[set[Polynomial]] = [set() for _ in range(20)]
    forests[0].add((1,))
    negative_rows: dict[Polynomial, dict[str, object]] = {}
    for order in range(1, 20):
        current: set[Polynomial] = set()
        for component_order in range(1, order + 1):
            for left in forests[order - component_order]:
                left_poly = Poly(list(left))
                for right in tree_sets[component_order]:
                    current.add(tuple(int(value) for value in left_poly * Poly(list(right))))
        forests[order] = current
        assert len(current) == EXPECTED_FOREST_COUNTS_THROUGH_19[order - 1]
        for poly in current:
            if len(poly) - 1 == 11 and v7(poly) < 0:
                negative_rows.setdefault(poly, {
                    "order": order,
                    "alpha": 11,
                    "components": components(poly),
                    "V7": v7(poly),
                    "polynomial": poly,
                    "sources": set(),
                    "occurrences": 0,
                })
                row = negative_rows[poly]
                row["sources"].add("distinct_forest_polynomial")
                row["occurrences"] = int(row["occurrences"]) + 1
        print(f"forests order={order} polynomials={len(current)}", flush=True)

    # Stream all connected order-20 trees, retaining only distinct tree
    # polynomials for the disconnected product pass is unnecessary.
    connected_order20_eligible = 0
    for tree in nx.nonisomorphic_trees(20):
        tree_counts[20] += 1
        poly = tree_polynomial(tree)
        if len(poly) - 1 == 11:
            connected_order20_eligible += 1
        if len(poly) - 1 == 11 and v7(poly) < 0:
            row = negative_rows.setdefault(poly, {
                "order": 20,
                "alpha": 11,
                "components": 1,
                "V7": v7(poly),
                "polynomial": poly,
                "sources": set(),
                "occurrences": 0,
            })
            row["sources"].add("connected_tree")
            row["occurrences"] = int(row["occurrences"]) + 1
            inspect_tree(tree, 20, poly)
    assert tree_counts[20] == EXPECTED_TREE_COUNTS[19]

    disconnected_products = 0
    disconnected_alpha11 = 0
    disconnected_negative_occurrences = 0
    for component_order in range(1, 11):
        for left in forests[20 - component_order]:
            left_poly = Poly(list(left))
            for right in tree_sets[component_order]:
                disconnected_products += 1
                poly = tuple(int(value) for value in left_poly * Poly(list(right)))
                if len(poly) - 1 != 11:
                    continue
                disconnected_alpha11 += 1
                if v7(poly) < 0:
                    disconnected_negative_occurrences += 1
                    row = negative_rows.setdefault(poly, {
                        "order": 20,
                        "alpha": 11,
                        "components": components(poly),
                        "V7": v7(poly),
                        "polynomial": poly,
                        "sources": set(),
                        "occurrences": 0,
                    })
                    row["sources"].add("disconnected_product_with_duplicates")
                    row["occurrences"] = int(row["occurrences"]) + 1

    # Every discovered negative row is connected, so it must have appeared in
    # the tree pass and its complete actual C-state set is available.
    assert len(negative_rows) == 15
    assert all(row["components"] == 1 for row in negative_rows.values())
    assert set(negative_rows) == set(rooted)
    assert disconnected_negative_occurrences == 0

    checks = 0
    global_minimum: tuple[Fraction, dict[str, object]] | None = None
    output_rows = []
    total_tree_realizations = 0
    total_root_occurrences = 0
    total_distinct_states = 0
    q_negative = 0
    residual_negative = 0
    for base, row in sorted(negative_rows.items(), key=lambda item: (item[1]["order"], item[1]["V7"], item[0])):
        root_record = rooted[base]
        states = dict(root_record["states"])
        states.setdefault(base, {
            "mode": "support_unattached_to_B",
            "graph6": root_record["first_graph6"],
            "vertex": None,
        })
        row_minimum: tuple[Fraction, dict[str, object]] | None = None
        for deletion, representative in states.items():
            full = pendant_polynomial(base, deletion)
            assert len(full) - 1 == 12
            p6 = coeff(full, 6)
            b5 = coeff(base, 5)
            c6 = coeff(deletion, 6)
            value_q = q7(full)
            numerator = 7 * b5 * value_q + 21 * c6 * p6 * b5 + v7(base) * p6
            denominator = 2 * p6 * b5
            margin = Fraction(numerator, denominator)
            assert h(full, 7) - h(base, 6) == margin
            checks += 1
            if value_q < 0:
                q_negative += 1
            if margin < 0:
                residual_negative += 1
            item = {
                "B": base,
                "C": deletion,
                "P": full,
                "Q7": value_q,
                "V7": v7(base),
                "c6": c6,
                "cleared_numerator": numerator,
                "margin": rational(margin),
                "representative": representative,
            }
            if row_minimum is None or margin < row_minimum[0]:
                row_minimum = (margin, item)
            if global_minimum is None or margin < global_minimum[0]:
                global_minimum = (margin, item)
        assert row_minimum is not None
        total_tree_realizations += int(root_record["tree_realizations"])
        total_root_occurrences += int(root_record["root_occurrences"])
        total_distinct_states += len(states)
        output_rows.append({
            **{key: value for key, value in row.items() if key not in {"sources"}},
            "sources": sorted(row["sources"]),
            "tree_realizations": root_record["tree_realizations"],
            "root_occurrences": root_record["root_occurrences"],
            "distinct_C_states_including_unattached": len(states),
            "minimum_coupled_reconstruction": row_minimum[1],
        })

    assert global_minimum is not None
    assert q_negative == 0 and residual_negative == 0
    report = {
        "status": "PASS_EXACT_FINITE_RANK7_ALPHA11_OBSTRUCTIONS_THROUGH_ORDER_20_NOT_THEOREM",
        "scope": {
            "B_alpha": 11,
            "maximum_B_order": 20,
            "missing_B_orders_for_complete_bipartite_boundary": [21, 22],
            "warning": "finite exact evidence only; B orders 21 and 22 remain",
            "order20_disconnected_exhaustive_reason": (
                "every disconnected order-20 forest has a component of order at most 10"
            ),
        },
        "coverage": {
            "unlabeled_tree_counts_through_20": tree_counts[1:],
            "forest_polynomial_counts_through_19": [len(forests[n]) for n in range(1, 20)],
            "order20_connected_alpha11_trees": connected_order20_eligible,
            "order20_disconnected_products_with_duplicates": disconnected_products,
            "order20_disconnected_alpha11_products": disconnected_alpha11,
            "order20_disconnected_negative_V7_occurrences": disconnected_negative_occurrences,
        },
        "obstructions": {
            "distinct_negative_V7_rows": len(negative_rows),
            "classification": "all 15 rows are connected tree rows",
            "rows": output_rows,
        },
        "coupled_reconstructions": {
            "matching_unlabeled_trees": total_tree_realizations,
            "root_occurrences": total_root_occurrences,
            "distinct_B_C_checks": checks,
            "distinct_C_state_sum": total_distinct_states,
            "Q7_negative_checks": q_negative,
            "residual_negative_checks": residual_negative,
            "global_minimum": global_minimum[1],
        },
        "elapsed_seconds": time.perf_counter() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(
        f"negative_V7_rows={len(negative_rows)} matching_trees={total_tree_realizations} "
        f"root_occurrences={total_root_occurrences} distinct_B_C_checks={checks}",
        flush=True,
    )
    print(f"minimum_margin={global_minimum[1]['margin']['text']}")
    print(f"script_sha256={hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}")
    print(f"report_sha256={hashlib.sha256(args.output.read_bytes()).hexdigest().upper()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
