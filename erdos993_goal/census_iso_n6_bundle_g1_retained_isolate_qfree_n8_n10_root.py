#!/usr/bin/env python3
"""Exact nonisomorphic-forest census of the two q-free tail polynomials."""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_rank8_forest_root_deletion_attachment_floor_root import (
    nonisomorphic_forests,
    tree_catalog,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_n8_n10_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_N8_N10_ROOT"
EXPECTED_INPUT_SHA256 = "239ED96A29102D24B205BAB4A7AD3180B60DEACF42C68C1059D061B0E0E784FE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash mismatch: {input_hash}")
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    evaluators = {}
    for geometry in ("adjacent", "nonadjacent"):
        label = f"{geometry}_u0_v0"
        expression = sp.sympify(source["branches"][label]["lower_expression"])
        variables = tuple(sorted(expression.free_symbols, key=str))
        evaluators[geometry] = (variables, sp.lambdify(variables, expression, "math"))

    catalog = tree_catalog(10)
    counts = {geometry: Counter() for geometry in evaluators}
    minima = {geometry: None for geometry in evaluators}
    order_counts = Counter()
    stream = hashlib.sha256()
    for order in range(8, 11):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            order_counts[f"forests_n{order}"] += 1
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
                variables, evaluate = evaluators[geometry]
                values = {**categories(rows(graph, u, v)), "n": order}
                value = int(evaluate(*(values[str(variable)] for variable in variables)))
                sign = "negative" if value < 0 else "positive" if value > 0 else "zero"
                counts[geometry][sign] += 1
                record = (value, order, graph6, u, v, forest_index)
                minima[geometry] = (
                    record if minima[geometry] is None or record < minima[geometry]
                    else minima[geometry]
                )
                stream.update(
                    f"{order}|{forest_index}|{graph6}|{u}|{v}|{geometry}|{value};".encode()
                )

    negative = sum(counts[geometry]["negative"] for geometry in counts)
    marker = MARKER if negative == 0 else "FAIL_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_N8_N10_ROOT"
    report = {
        "marker": marker,
        "orders": [8, 10],
        "order_counts": dict(order_counts),
        "cells": sum(sum(counter.values()) for counter in counts.values()),
        "counts": {geometry: dict(counts[geometry]) for geometry in counts},
        "minima": {geometry: list(minima[geometry]) for geometry in minima},
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "coverage": (
            "Every nonisomorphic forest of orders 8,9,10 and every unordered marked pair; "
            "the exact branch-domination reduction makes retained-mark count zero the worst branch."
        ),
        "scope_guard": "Finite collar only; it does not prove the q-free tail for order >=11.",
        "input_sha256": input_hash,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
