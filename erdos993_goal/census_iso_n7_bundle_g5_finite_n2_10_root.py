#!/usr/bin/env python3
"""Exhaust the finite n=2..10 side of the rank-seven bundle g5 problem.

Every unlabeled forest, ordered pair of distinct marks, and canonical parent
choice is evaluated directly from the pinned rank-seven bundle polynomial.
The independence rows use the literal bit-mask deletion recurrence shared with
the already frozen g6 census, but this script has an independent output stream.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from census_iso_n7_bundle_g6_finite_n2_10_root import polynomial_rows
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g5_finite_n2_10_exact_root_20260830.json"
ALGEBRA = HERE / "iso_n7_whole_bundle_binomial_symbolic_root_20260830.json"
ALGEBRA_SHA256 = "266694256F63EA12F512F56CF765B56B56B71BFB1618599CC36CA2BBE4375D8C"
HELPER = HERE / "census_iso_n7_bundle_g6_finite_n2_10_root.py"
HELPER_SHA256 = "9D885EB9955EB9B67B0F4B5DBE1EFA5A8F515357C8EC66FE67233A90B5B37E6C"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G5_FINITE_N2_10_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(ALGEBRA) == ALGEBRA_SHA256
    assert sha256(HELPER) == HELPER_SHA256
    algebra = json.loads(ALGEBRA.read_text(encoding="utf-8"))
    assert algebra["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    raw = sp.sympify(algebra["binomial_coefficients"][5]["factor"])
    symbols = tuple(sorted(raw.free_symbols, key=str))
    evaluator = sp.lambdify(symbols, raw, modules="math")

    totals = {"forests": 0, "marked": 0, "cells": 0, "negative": 0}
    digest = hashlib.sha256()
    per_order: dict[str, dict[str, int]] = {}
    mode_counts = {"no_parent": 0, "endpoint_parent": 0, "ordinary_parent": 0}
    mode_minima = {key: None for key in mode_counts}
    minimum = None
    minimum_witness = None
    first_negatives: list[dict[str, object]] = []

    for order in range(2, 11):
        local = {"forests": 0, "marked": 0, "cells": 0, "negative": 0}
        for graph0 in forest_graphs(order):
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            full, poly = polynomial_rows(graph)
            nodes = tuple(range(order))
            for u in nodes:
                for v in nodes:
                    if u == v:
                        continue
                    c_masks = (
                        full,
                        full & ~(1 << u),
                        full & ~(1 << v),
                        full & ~(1 << u) & ~(1 << v),
                    )
                    crows = tuple(poly(mask) for mask in c_masks)
                    local["marked"] += 1
                    for parent in (None, *nodes):
                        d_full = full if parent is None else full & ~(1 << parent)
                        d_masks = (
                            d_full,
                            d_full & ~(1 << u),
                            d_full & ~(1 << v),
                            d_full & ~(1 << u) & ~(1 << v),
                        )
                        drows = tuple(poly(mask) for mask in d_masks)
                        rows = {
                            **{name: row for name, row in zip("EUVW", crows)},
                            **{f"d{name}": row for name, row in zip("EUVW", drows)},
                        }
                        arguments = []
                        for symbol in symbols:
                            label = str(symbol)
                            if label.startswith("c"):
                                arguments.append(rows[label[1]][int(label[2:])])
                            elif label.startswith("d"):
                                arguments.append(rows[f"d{label[1]}"][int(label[2:])])
                            else:
                                raise AssertionError(label)
                        raw_value = evaluator(*arguments)
                        value = int(raw_value)
                        assert value == raw_value
                        mode = (
                            "no_parent" if parent is None else
                            "endpoint_parent" if parent in (u, v) else
                            "ordinary_parent"
                        )
                        mode_counts[mode] += 1
                        old_mode_minimum = mode_minima[mode]
                        if old_mode_minimum is None or value < old_mode_minimum:
                            mode_minima[mode] = value
                        digest.update(
                            f"{order}:{graph6}:{u}:{v}:{parent}:{value};".encode()
                        )
                        if minimum is None or value < minimum:
                            minimum = value
                            minimum_witness = {
                                "value": value, "order": order, "graph6": graph6,
                                "u": u, "v": v, "parent": parent, "mode": mode,
                            }
                        if value < 0:
                            local["negative"] += 1
                            if len(first_negatives) < 64:
                                first_negatives.append(
                                    {
                                        "value": value, "order": order,
                                        "graph6": graph6, "u": u, "v": v,
                                        "parent": parent, "mode": mode,
                                    }
                                )
                        local["cells"] += 1
            local["forests"] += 1
        for key in totals:
            totals[key] += local[key]
        per_order[str(order)] = {
            "unlabeled_forests": local["forests"],
            "ordered_mark_pairs": local["marked"],
            "parent_cells": local["cells"],
            "negative_g5": local["negative"],
        }
        print(
            "FINITE_N7_G5", order, local["forests"], local["marked"],
            local["cells"], local["negative"], flush=True,
        )

    assert totals["negative"] == 0 and not first_negatives
    report = {
        "marker": MARKER,
        "theorem": (
            "For every forest C of order 2 through 10, every ordered pair of "
            "distinct marks, and every canonical parent p or no-parent choice, "
            "the exact rank-seven bundle coefficient g5 is nonnegative."
        ),
        "orders": [2, 10],
        "unlabeled_forests": totals["forests"],
        "ordered_mark_pairs": totals["marked"],
        "parent_cells": totals["cells"],
        "negative_g5": totals["negative"],
        "first_negatives": first_negatives,
        "minimum": minimum,
        "minimum_witness": minimum_witness,
        "mode_counts": mode_counts,
        "mode_minima": mode_minima,
        "per_order": per_order,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "enumeration": (
            "Every unlabeled forest exactly once as a nondecreasing multiset "
            "of unlabeled trees; every ordered distinct mark pair; D=C for no "
            "parent and D=C-p for every possible parent p; literal bit-mask "
            "independence-polynomial deletion recurrence."
        ),
        "algebra_sha256": ALGEBRA_SHA256,
        "helper_sha256": HELPER_SHA256,
        "scope": (
            "Exact finite theorem only for rank-seven g5 and C-order 2..10. "
            "The all-order cone, other coefficients, all-N7, and Problem 993 "
            "remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "unlabeled_forests": totals["forests"],
        "ordered_mark_pairs": totals["marked"],
        "parent_cells": totals["cells"],
        "minimum": minimum,
        "negative_g5": totals["negative"],
        "ordered_stream_sha256": report["ordered_stream_sha256"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
