#!/usr/bin/env python3
"""Exact all-order containment-box theorem for endpoint-marked paths."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g1_marked_cone_g1_nonadjacent import doubly_partitioned_g1
from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_path_endpoint_marks_sector_exact_g1_nonadjacent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_PATH_ENDPOINT_MARKS_SECTOR_G1_NONADJACENT"


def main():
    _, expression, _, _ = doubly_partitioned_g1()
    names = {str(x): x for x in expression.free_symbols}
    for family in "WABZ":
        for rank in range(2, 8):
            names.setdefault(f"C{family}{rank}", sp.Symbol(f"C{family}{rank}", nonnegative=True))
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    base = sp.expand(expression.subs({x: 0 for x in dvars}))
    always_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    always_positive = {"DA4", "DB4", "DZ5"}
    mixed = tuple(sorted(set(map(str, dvars)) - always_negative - always_positive))
    assert len(mixed) == 8

    n, t = sp.symbols("n t", integer=True, nonnegative=True)
    path = {}
    for rank in range(2, 8):
        path[names[f"CW{rank}"]] = sp.binomial(n - rank - 1, rank)
        path[names[f"CA{rank}"]] = sp.binomial(n - rank - 1, rank - 1)
        path[names[f"CB{rank}"]] = sp.binomial(n - rank - 1, rank - 1)
        path[names[f"CZ{rank}"]] = sp.binomial(n - rank - 1, rank - 2)

    failures = []
    minimum = None
    coefficient_count = 0
    sector_hashes = []
    for mask in range(1 << len(mixed)):
        current = base
        selected = always_negative | {
            name for bit, name in enumerate(mixed) if mask & (1 << bit)
        }
        for dvar in dvars:
            if str(dvar) in selected:
                current += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        polynomial = sp.Poly(sp.expand_func(current.subs(path)).subs(n, t + 15), t)
        coefficients = tuple(polynomial.all_coeffs())
        coefficient_count += len(coefficients)
        sector_hashes.append(hashlib.sha256(sp.srepr(polynomial.as_expr()).encode()).hexdigest().upper())
        bad = [value for value in coefficients if value < 0]
        if bad:
            failures.append({"mask": mask, "first_negative": str(bad[0])})
        if coefficients:
            local = min(coefficients)
            minimum = local if minimum is None else min(minimum, local)
    assert not failures, failures[:8]

    evaluate = evaluator()
    finite_stream = hashlib.sha256()
    finite_cells = 0
    finite_minimum = None
    finite_minimum_witness = None
    for order in range(2, 15):
        graph = nx.path_graph(order)
        u, v = 0, order - 1
        crows = rows(graph, u, v)
        for mask in range(1 << order):
            retained = [node for node in graph if mask & (1 << node)]
            drows = rows(graph.subgraph(retained).copy(), u, v)
            value = evaluate(crows, drows)
            assert value >= 0, (order, mask, value)
            finite_stream.update(f"{order}|{mask}|{value};".encode())
            finite_cells += 1
            if finite_minimum is None or value < finite_minimum:
                finite_minimum = value
                finite_minimum_witness = [order, mask, value]
    report = {
        "marker": MARKER,
        "theorem": (
            "For every path P_n of order n>=2 with its two endpoints marked, and every "
            "actual induced marked minor D, the rank-six bundle coefficient g1 is nonnegative."
        ),
        "category_rows": {
            "CW_r": "binom(n-r-1,r)",
            "CA_r=CB_r": "binom(n-r-1,r-1)",
            "CZ_r": "binom(n-r-1,r-2)",
        },
        "finite_certificate": {
            "orders": [2, 14],
            "actual_induced_D_cells": finite_cells,
            "minimum": finite_minimum,
            "minimum_witness": finite_minimum_witness,
            "ordered_stream_sha256": finite_stream.hexdigest().upper(),
        },
        "sector_count": 256,
        "power_coefficient_count": coefficient_count,
        "minimum_power_coefficient": str(minimum),
        "all_power_coefficients_nonnegative": True,
        "sector_polynomial_hashes_sha256": hashlib.sha256("".join(sector_hashes).encode()).hexdigest().upper(),
        "scope_guard": (
            "This covers endpoint-marked paths only; it is not an ordinary-leaf "
            "monotonicity theorem, universal rank-six g1 theorem, all-N6 theorem, "
            "or proof of Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print("SECTORS", report["sector_count"], "COEFFICIENTS", coefficient_count, "MIN", minimum)
    print(MARKER)


if __name__ == "__main__":
    main()
