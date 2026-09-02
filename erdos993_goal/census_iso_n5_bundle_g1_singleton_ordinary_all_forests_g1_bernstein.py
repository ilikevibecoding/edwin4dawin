#!/usr/bin/env python3
"""Exact finite census for rank-five singleton-ordinary bundle g1.

For every unlabeled forest G of order 3 through 13 and every ordered triple
of distinct vertices (u,v,p), this source constructs

    C=(I(G),I(G-u),I(G-v),I(G-u-v)),
    D=(I(G-p),I(G-p-u),I(G-p-v),I(G-p-u-v))

through rank six and evaluates the raw 54-term g1 coefficient derived from
Gamma_1.  The independence rows are computed by an independent literal
bitmask vertex recurrence.  This is a finite theorem only; it contains no
extrapolation to larger orders and no claim about other canonical modes.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from functools import lru_cache
from pathlib import Path

import networkx as nx
import numpy as np
import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    raw_coefficients,
)
from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
DEPENDENCY = HERE / "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"
MARKER = "PASS_EXACT_FINITE_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_ALL_FORESTS_G1_BERNSTEIN"
PROBE_MARKER = "PROBE_EXACT_FINITE_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_ALL_FORESTS_G1_BERNSTEIN"
KNOWN_FOREST_COUNTS = {
    3: 3,
    4: 6,
    5: 10,
    6: 20,
    7: 37,
    8: 76,
    9: 153,
    10: 329,
    11: 710,
    12: 1601,
    13: 3658,
}


def forest_graphs(order: int):
    """Yield every unlabeled forest as a nondecreasing multiset of trees."""
    component_types: list[tuple[int, nx.Graph]] = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            component_types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining: int, start: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([component_types[index][1] for index in chosen])
            return
        for index in range(start, len(component_types)):
            size = component_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def row_recurrence(graph: nx.Graph):
    """Return the exact rank-0..6 independence row for each requested mask."""
    order = len(graph)
    adjacency = [0] * order
    for vertex in range(order):
        for neighbor in graph.neighbors(vertex):
            adjacency[vertex] |= 1 << neighbor

    @lru_cache(maxsize=None)
    def row(kept: int) -> tuple[int, ...]:
        if kept == 0:
            return (1, 0, 0, 0, 0, 0, 0)
        # A high-current-degree pivot makes the literal recurrence compact;
        # the identity I(H)=I(H-v)+x I(H-N[v]) is exact for any pivot.
        vertices = [vertex for vertex in range(order) if kept & (1 << vertex)]
        pivot = max(vertices, key=lambda vertex: (adjacency[vertex] & kept).bit_count())
        without = kept & ~(1 << pivot)
        excluded = row(without)
        included = row(without & ~adjacency[pivot])
        return tuple(
            excluded[rank] + (included[rank - 1] if rank else 0)
            for rank in range(7)
        )

    full = (1 << order) - 1

    def deleted(mask: int) -> tuple[int, ...]:
        return row(full & ~mask)

    return deleted


def raw_g1_terms():
    crows, drows, g1, _g2 = raw_coefficients()
    variables = tuple(symbol for row in crows + drows for symbol in row)
    terms = []
    for monomial, coefficient in sp.Poly(g1, *variables).terms():
        numerator, denominator = map(int, sp.fraction(coefficient))
        assert denominator == 1
        factors = tuple((index, power) for index, power in enumerate(monomial) if power)
        terms.append((numerator, factors))
    assert len(terms) == 54
    assert max(sum(power for _index, power in factors) for _coefficient, factors in terms) <= 2
    return terms


def exact_scalar(terms, rows: tuple[tuple[int, ...], ...]) -> int:
    flat = tuple(value for row in rows for value in row)
    total = 0
    for coefficient, factors in terms:
        term = coefficient
        for index, power in factors:
            term *= flat[index] ** power
        total += term
    return total


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=3)
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    if not (3 <= args.min_order <= args.max_order <= 13):
        raise ValueError("require 3 <= min-order <= max-order <= 13")
    authoritative = args.min_order == 3 and args.max_order == 13
    marker = MARKER if authoritative else PROBE_MARKER
    terms = raw_g1_terms()
    total_forests = 0
    total_cells = 0
    total_zero = 0
    global_minimum = None
    global_smallest_positive = None
    rows_report: dict[str, dict] = {}
    ordered_digest = hashlib.sha256()

    for order in range(args.min_order, args.max_order + 1):
        triples = np.asarray(tuple(itertools.permutations(range(order), 3)), dtype=np.int64)
        u, v, p = triples.T
        cells_per_forest = len(triples)
        assert cells_per_forest == order * (order - 1) * (order - 2)
        forest_count = 0
        order_zero = 0
        order_minimum = None
        order_smallest_positive = None

        for forest_index, graph0 in enumerate(forest_graphs(order)):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph0)
            deleted_row = row_recurrence(graph)

            # Cross-check the independent recurrence on the undeleted row for
            # every generated forest against the established forest routine.
            full_row = deleted_row(0)
            established = tuple(poly_forest(graph))
            established = established + (0,) * (7 - len(established))
            assert full_row == established[:7]

            masks = np.stack((
                np.zeros(cells_per_forest, dtype=np.int64),
                np.left_shift(1, u),
                np.left_shift(1, v),
                np.bitwise_or(np.left_shift(1, u), np.left_shift(1, v)),
                np.left_shift(1, p),
                np.bitwise_or(np.left_shift(1, p), np.left_shift(1, u)),
                np.bitwise_or(np.left_shift(1, p), np.left_shift(1, v)),
                np.bitwise_or(
                    np.bitwise_or(np.left_shift(1, p), np.left_shift(1, u)),
                    np.left_shift(1, v),
                ),
            ))
            row_arrays = np.stack([
                np.asarray([deleted_row(int(mask)) for mask in row_masks], dtype=np.int64)
                for row_masks in masks
            ])
            values = np.zeros(cells_per_forest, dtype=np.int64)
            for coefficient, factors in terms:
                term = np.full(cells_per_forest, coefficient, dtype=np.int64)
                for index, power in factors:
                    row_index, rank = divmod(index, 7)
                    term *= row_arrays[row_index, :, rank] ** power
                values += term
            max_abs = int(np.max(np.abs(values)))
            assert max_abs < 2**60
            minimum_index = int(np.argmin(values))
            minimum = int(values[minimum_index])
            if minimum < 0:
                tu, tv, tp = map(int, triples[minimum_index])
                raise AssertionError(
                    "negative singleton-ordinary g1",
                    order, forest_index, tu, tv, tp, minimum,
                    nx.to_graph6_bytes(graph, header=False).decode().strip(),
                )

            # Replay the extremal cell with scalar Python integers, so the
            # vectorized int64 path is not the sole arithmetic implementation.
            scalar_rows = tuple(
                deleted_row(int(masks[row_index, minimum_index]))
                for row_index in range(8)
            )
            assert exact_scalar(terms, scalar_rows) == minimum

            positive_indices = np.flatnonzero(values > 0)
            smallest_positive = (
                int(np.min(values[positive_indices])) if len(positive_indices) else None
            )
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            witness = {
                "order": order,
                "forest_index": forest_index,
                "graph6": graph6,
                "marks_uvp": list(map(int, triples[minimum_index])),
                "value": minimum,
            }
            if order_minimum is None or minimum < order_minimum["value"]:
                order_minimum = witness
            if global_minimum is None or minimum < global_minimum["value"]:
                global_minimum = witness
            if smallest_positive is not None:
                positive_index = int(np.flatnonzero(values == smallest_positive)[0])
                positive_witness = {
                    "order": order,
                    "forest_index": forest_index,
                    "graph6": graph6,
                    "marks_uvp": list(map(int, triples[positive_index])),
                    "value": smallest_positive,
                }
                if order_smallest_positive is None or smallest_positive < order_smallest_positive["value"]:
                    order_smallest_positive = positive_witness
                if global_smallest_positive is None or smallest_positive < global_smallest_positive["value"]:
                    global_smallest_positive = positive_witness

            zero = int(np.count_nonzero(values == 0))
            order_zero += zero
            total_zero += zero
            ordered_digest.update(f"{order}|{forest_index}|{graph6}|".encode())
            ordered_digest.update(values.astype("<i8", copy=False).tobytes())

        assert forest_count == KNOWN_FOREST_COUNTS[order]
        order_cells = forest_count * cells_per_forest
        total_forests += forest_count
        total_cells += order_cells
        rows_report[str(order)] = {
            "unlabeled_forests": forest_count,
            "ordered_distinct_uvp_cells": order_cells,
            "zero_cells": order_zero,
            "minimum": order_minimum,
            "smallest_positive": order_smallest_positive,
        }
        print(json.dumps({"order": order, **rows_report[str(order)]}, sort_keys=True), flush=True)

    expected_cells = sum(
        KNOWN_FOREST_COUNTS[order] * order * (order - 1) * (order - 2)
        for order in range(args.min_order, args.max_order + 1)
    )
    assert total_cells == expected_cells
    output = HERE / (
        "iso_n5_bundle_g1_singleton_ordinary_all_forests_finite_"
        f"{args.min_order}_{args.max_order}_g1_bernstein_20260830.json"
    )
    report = {
        "marker": marker,
        "theorem": (
            "Raw rank-five singleton-ordinary g1 is nonnegative on every ordered "
            "distinct (u,v,p) cell of every unlabeled forest in the displayed "
            "finite order interval."
        ),
        "orders": [args.min_order, args.max_order],
        "unlabeled_forests": total_forests,
        "ordered_distinct_uvp_cells": total_cells,
        "zero_cells": total_zero,
        "global_minimum": global_minimum,
        "global_smallest_positive": global_smallest_positive,
        "ordered_value_stream_sha256": ordered_digest.hexdigest().upper(),
        "rows": rows_report,
        "raw_g1": {
            "term_count": len(terms),
            "configuration": "C=rows(G); D=rows(G-p), with p,u,v distinct",
            "row_rank_range": [0, 6],
        },
        "completeness": {
            "forest_generation": "nondecreasing multisets of every nonisomorphic tree type",
            "known_unlabeled_forest_counts_checked": True,
            "every_ordered_distinct_triple_checked": True,
            "independence_rows": "literal bitmask vertex recurrence through rank six",
            "undeleted_rows_cross_checked": "poly_forest on every generated forest",
            "minimum_cell_scalar_replay": True,
        },
        "scope": (
            "Exact finite singleton-ordinary g1 theorem only. No extrapolation, "
            "other canonical mode, all-N5, or Erdos Problem 993 claim."
        ),
        "dependencies_sha256": {
            DEPENDENCY.name: hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    report_sha = hashlib.sha256(raw.encode()).hexdigest().upper()
    print(json.dumps({
        "marker": marker,
        "output": output.name,
        "unlabeled_forests": total_forests,
        "ordered_distinct_uvp_cells": total_cells,
        "global_minimum": global_minimum,
        "global_smallest_positive": global_smallest_positive,
        "source_sha256": report["source_sha256"],
        "report_sha256": report_sha,
    }, indent=2, sort_keys=True), flush=True)
    print(marker, flush=True)


if __name__ == "__main__":
    main()
