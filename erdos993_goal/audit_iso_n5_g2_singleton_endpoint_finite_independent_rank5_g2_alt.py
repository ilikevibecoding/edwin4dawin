#!/usr/bin/env python3
"""Independent exact audit of the finite singleton-endpoint g2 census.

This audit reconstructs raw g2 from the compact gamma identity rather than
the producer's canonical raw-coefficient source.  It independently generates
all forests, uses a separate lowest-label deletion recurrence, recomputes all
907,410 ordered cells, and requires the full value-stream digest to match.
"""

from __future__ import annotations

import functools
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import numpy as np
import sympy as sp

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import raw_g2


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "census_iso_n5_g2_singleton_endpoint_all_forests_rank5_g2_alt.py"
PRODUCER_REPORT = HERE / "iso_n5_g2_singleton_endpoint_all_forests_finite_2_13_rank5_g2_alt_20260830.json"
OUTPUT = HERE / "iso_n5_g2_singleton_endpoint_finite_independent_audit_rank5_g2_alt_20260830.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_FINITE_AUDIT_RANK5_G2_ALT"
EXPECTED_PRODUCER_SOURCE = "B8B16A74B7B64BF90581FE3ADE4AA4BDE2AA2DF275BCCF0C39E522DFA276E1FF"
EXPECTED_PRODUCER_REPORT = "0B96397967C14BCC034254DE13F474C271111301E09B55AFDC3FEB117D962C69"
EXPECTED_STREAM = "D91784F734D32B2A18C1F5FED556AC6AB66165F216DB29120770AA6462151D36"
FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76,
                 9: 153, 10: 329, 11: 710, 12: 1601, 13: 3658}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def forest_graphs(order):
    types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining, start, chosen):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def alternate_rows(graph):
    order = len(graph)
    adjacency = [0] * order
    for u, v in graph.edges():
        adjacency[u] |= 1 << v
        adjacency[v] |= 1 << u

    @functools.lru_cache(maxsize=None)
    def polynomial(kept):
        if not kept:
            return (1, 0, 0, 0, 0, 0, 0)
        pivot = (kept & -kept).bit_length() - 1
        without = kept & ~(1 << pivot)
        excluded = polynomial(without)
        included = polynomial(without & ~adjacency[pivot])
        return tuple(
            excluded[rank] + (included[rank - 1] if rank else 0)
            for rank in range(7)
        )

    full = (1 << order) - 1
    return lambda deleted: polynomial(full & ~deleted)


def compact_endpoint_terms():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    expression = raw_g2(crows, drows)
    endpoint_rules = {}
    for rank in range(7):
        endpoint_rules.update({
            drows[0][rank]: crows[1][rank],
            drows[1][rank]: crows[1][rank],
            drows[2][rank]: crows[3][rank],
            drows[3][rank]: crows[3][rank],
        })
    expression = sp.expand(expression.subs(endpoint_rules))
    variables = tuple(symbol for row in crows for symbol in row)
    terms = []
    for monomial, coefficient in sp.Poly(expression, *variables).terms():
        assert coefficient.q == 1
        terms.append((
            int(coefficient),
            tuple((index, power) for index, power in enumerate(monomial) if power),
        ))
    assert len(terms) == 48
    return terms


def scalar(terms, rows):
    flat = tuple(value for row in rows for value in row)
    answer = 0
    for coefficient, factors in terms:
        term = coefficient
        for index, power in factors:
            term *= flat[index] ** power
        answer += term
    return answer


def main():
    assert sha256(PRODUCER) == EXPECTED_PRODUCER_SOURCE
    assert sha256(PRODUCER_REPORT) == EXPECTED_PRODUCER_REPORT
    producer = json.loads(PRODUCER_REPORT.read_text())
    assert producer["ordered_value_stream_sha256"] == EXPECTED_STREAM
    terms = compact_endpoint_terms()
    digest = hashlib.sha256()
    total_forests = total_cells = 0
    global_minimum = None
    order_rows = {}
    for order in range(2, 14):
        pairs = np.asarray(tuple(itertools.permutations(range(order), 2)), dtype=np.int64)
        u, v = pairs.T
        count = len(pairs)
        masks = np.stack((
            np.zeros(count, dtype=np.int64),
            np.left_shift(1, u),
            np.left_shift(1, v),
            np.bitwise_or(np.left_shift(1, u), np.left_shift(1, v)),
        ))
        forests = 0
        order_minimum = None
        for forest_index, graph0 in enumerate(forest_graphs(order)):
            forests += 1
            graph = nx.convert_node_labels_to_integers(graph0)
            row = alternate_rows(graph)
            arrays = np.stack([
                np.asarray([row(int(mask)) for mask in line], dtype=np.int64)
                for line in masks
            ])
            values = np.zeros(count, dtype=np.int64)
            for coefficient, factors in terms:
                term = np.full(count, coefficient, dtype=np.int64)
                for index, power in factors:
                    row_index, rank = divmod(index, 7)
                    term *= arrays[row_index, :, rank] ** power
                values += term
            minimum_index = int(np.argmin(values))
            minimum = int(values[minimum_index])
            assert minimum >= 0
            replay = tuple(row(int(masks[index, minimum_index])) for index in range(4))
            assert scalar(terms, replay) == minimum
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            record = {
                "order": order,
                "forest_index": forest_index,
                "graph6": graph6,
                "marks_uv": list(map(int, pairs[minimum_index])),
                "value": minimum,
            }
            if order_minimum is None or minimum < order_minimum["value"]:
                order_minimum = record
            if global_minimum is None or minimum < global_minimum["value"]:
                global_minimum = record
            digest.update(f"{order}|{forest_index}|{graph6}|".encode())
            digest.update(values.astype("<i8", copy=False).tobytes())
        assert forests == FOREST_COUNTS[order]
        cells = forests * count
        total_forests += forests
        total_cells += cells
        assert order_minimum == producer["rows"][str(order)]["minimum"]
        order_rows[str(order)] = {
            "unlabeled_forests": forests,
            "cells": cells,
            "minimum": order_minimum,
        }
        print(json.dumps({"order": order, **order_rows[str(order)]}, sort_keys=True), flush=True)
    assert total_forests == 6605 and total_cells == 907410
    assert global_minimum == producer["global_minimum"]
    assert digest.hexdigest().upper() == EXPECTED_STREAM
    compact_source = HERE / "derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt.py"
    report = {
        "marker": MARKER,
        "audited_orders": [2, 13],
        "unlabeled_forests": total_forests,
        "ordered_distinct_uv_cells": total_cells,
        "global_minimum": global_minimum,
        "ordered_value_stream_sha256": digest.hexdigest().upper(),
        "rows": order_rows,
        "independence": {
            "raw_g2_source": "independent compact gamma reconstruction",
            "row_engine": "separate lowest-label deletion recurrence",
            "producer_value_stream_exact_match": True,
        },
        "dependencies_sha256": {
            PRODUCER.name: EXPECTED_PRODUCER_SOURCE,
            PRODUCER_REPORT.name: EXPECTED_PRODUCER_REPORT,
            compact_source.name: sha256(compact_source),
        },
        "scope": "Independent exact audit of finite singleton-endpoint g2 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "forests": total_forests,
        "cells": total_cells,
        "stream_sha256": report["ordered_value_stream_sha256"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
