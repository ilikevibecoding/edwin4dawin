#!/usr/bin/env python3
"""Exhaust the finite n=2..10 side of the rank-seven bundle g6 theorem.

For every unlabeled forest C, every ordered pair of distinct marks, and every
canonical parent choice (no parent, either marked parent, or an ordinary
parent), evaluate the exact rank-seven binomial coefficient g6.  The D rows
are C for no parent and C-p otherwise.  Independence rows are computed by a
literal bit-mask deletion recurrence.
"""

from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path

import networkx as nx
import sympy as sp

from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g6_finite_n2_10_exact_root_20260830.json"
ALGEBRA = HERE / "iso_n7_whole_bundle_binomial_symbolic_root_20260830.json"
ALGEBRA_SHA256 = "266694256F63EA12F512F56CF765B56B56B71BFB1618599CC36CA2BBE4375D8C"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G6_FINITE_N2_10_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial_rows(graph: nx.Graph, maximum: int = 7):
    nodes = tuple(sorted(graph.nodes()))
    assert nodes == tuple(range(len(nodes)))
    adjacency = tuple(
        sum(1 << neighbor for neighbor in graph.neighbors(vertex))
        for vertex in nodes
    )

    @lru_cache(maxsize=None)
    def poly(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1,) + (0,) * maximum
        lowest = mask & -mask
        vertex = lowest.bit_length() - 1
        without = mask & ~lowest
        without_closed = without & ~adjacency[vertex]
        first = poly(without)
        second = poly(without_closed)
        return tuple(
            first[index] + (second[index - 1] if index else 0)
            for index in range(maximum + 1)
        )

    full = (1 << len(nodes)) - 1
    for mask in range(full + 1):
        poly(mask)
    return full, poly


def main() -> None:
    assert sha256(ALGEBRA) == ALGEBRA_SHA256
    algebra = json.loads(ALGEBRA.read_text(encoding="utf-8"))
    assert algebra["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    raw = sp.sympify(algebra["binomial_coefficients"][6]["factor"])
    symbols = tuple(sorted(raw.free_symbols, key=str))
    evaluator = sp.lambdify(symbols, raw, modules="math")

    total_forests = total_marked = total_cells = total_negative = 0
    digest = hashlib.sha256()
    per_order = {}
    mode_counts = {
        "no_parent": 0,
        "endpoint_parent": 0,
        "ordinary_parent": 0,
    }
    mode_minima = {key: None for key in mode_counts}
    minimum = None
    minimum_witness = None
    first_negatives = []

    for order in range(2, 11):
        local_forests = local_marked = local_cells = local_negative = 0
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
                    local_marked += 1
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
                                prefix = label[1]
                                index = int(label[2:])
                                arguments.append(rows[prefix][index])
                            elif label.startswith("d"):
                                prefix = f"d{label[1]}"
                                index = int(label[2:])
                                arguments.append(rows[prefix][index])
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
                        if mode_minima[mode] is None or value < mode_minima[mode]:
                            mode_minima[mode] = value
                        digest.update(
                            f"{order}:{graph6}:{u}:{v}:{parent}:{value};".encode()
                        )
                        if minimum is None or value < minimum:
                            minimum = value
                            minimum_witness = {
                                "value": value,
                                "order": order,
                                "graph6": graph6,
                                "u": u,
                                "v": v,
                                "parent": parent,
                                "mode": mode,
                            }
                        if value < 0:
                            local_negative += 1
                            if len(first_negatives) < 64:
                                first_negatives.append(
                                    {
                                        "value": value,
                                        "order": order,
                                        "graph6": graph6,
                                        "u": u,
                                        "v": v,
                                        "parent": parent,
                                        "mode": mode,
                                    }
                                )
                        local_cells += 1
            local_forests += 1
        total_forests += local_forests
        total_marked += local_marked
        total_cells += local_cells
        total_negative += local_negative
        per_order[str(order)] = {
            "unlabeled_forests": local_forests,
            "ordered_mark_pairs": local_marked,
            "parent_cells": local_cells,
            "negative_g6": local_negative,
        }
        print(
            "FINITE_N7_G6",
            order,
            local_forests,
            local_marked,
            local_cells,
            local_negative,
            flush=True,
        )

    assert total_negative == 0 and not first_negatives
    report = {
        "marker": MARKER,
        "theorem": (
            "For every forest C of order 2 through 10, every ordered pair of "
            "distinct marks, and every canonical parent p or no-parent choice, "
            "the exact rank-seven bundle coefficient g6 is nonnegative."
        ),
        "orders": [2, 10],
        "unlabeled_forests": total_forests,
        "ordered_mark_pairs": total_marked,
        "parent_cells": total_cells,
        "negative_g6": total_negative,
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
        "scope": (
            "Exact finite theorem only for rank-seven g6 and C-order 2..10. "
            "The all-order n>=11 cone, other coefficients, all-N7, and Problem "
            "993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "unlabeled_forests": total_forests,
                "ordered_mark_pairs": total_marked,
                "parent_cells": total_cells,
                "minimum": minimum,
                "negative_g6": total_negative,
                "ordered_stream_sha256": report["ordered_stream_sha256"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
