#!/usr/bin/env python3
"""Exact shifted-binomial probe for the five-edge isolated-marks G2 cell."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx
import sympy as sp

from prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise import (
    forests_without_isolates,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G2_SUM0_NO_PARENT_FIVE_EDGE_ISOLATE_"
    "PADDING_RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value - offset for offset in range(rank))/sp.factorial(rank)


def independence_row(graph):
    vertices = list(graph)
    row = [0]*9
    for mask in range(1 << len(vertices)):
        selected = [vertices[i] for i in range(len(vertices)) if mask >> i & 1]
        if all(not graph.has_edge(a, b) for a, b in itertools.combinations(selected, 2)):
            if len(selected) <= 8:
                row[len(selected)] += 1
    return tuple(row)


def component_orders(graph):
    return tuple(sorted((len(c) for c in nx.connected_components(graph)), reverse=True))


def binomial_coefficients(polynomial, variable):
    degree = sp.Poly(polynomial, variable).degree()
    values = [sp.expand(polynomial.subs(variable, integer)) for integer in range(degree + 1)]
    coefficients = []
    while values:
        coefficients.append(values[0])
        values = [sp.expand(values[i + 1] - values[i]) for i in range(len(values) - 1)]
    reconstruction = sp.expand(sum(
        coefficients[k]*choose(variable, k) for k in range(len(coefficients))
    ))
    assert sp.expand(reconstruction - polynomial) == 0
    return tuple(coefficients)


def main() -> None:
    parent_path = HERE / "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json"
    parent = json.loads(parent_path.read_text(encoding="utf-8"))
    assert parent["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_G2_PARENT_MODES_RANK7_G5_FINISH"
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}")
        for family in "WABZ" for rank in range(1, 9)
    }
    expression = sp.expand(sp.sympify(
        parent["modes"]["no_parent"]["expression"], locals=symbols
    ))
    shifts = {
        symbols[f"A{rank}"]: symbols[f"W{rank - 1}"] for rank in range(3, 9)
    }
    shifts.update({
        symbols[f"B{rank}"]: symbols[f"W{rank - 1}"] for rank in range(3, 9)
    })
    shifts.update({
        symbols[f"Z{rank}"]: symbols[f"W{rank - 2}"] for rank in range(4, 9)
    })
    reduced = sp.expand(expression.subs(shifts, simultaneous=True))
    w = {rank: symbols[f"W{rank}"] for rank in range(2, 9)}
    q2 = sp.expand(
        16*w[2]*w[3] + 20*w[2]*w[4] - 68*w[2]*w[5]
        - 107*w[2]*w[6] - 51*w[2]*w[7] - 8*w[2]*w[8]
        + 28*w[3]**2 + 100*w[3]*w[4] - 16*w[3]*w[5]
        - 63*w[3]*w[6] - 18*w[3]*w[7] + 91*w[4]**2
        + 66*w[4]*w[5] + 10*w[5]**2
    )
    assert sp.expand(reduced - q2) == 0

    padding = sp.Symbol("padding", integer=True, nonnegative=True)
    cores = []
    stream = hashlib.sha256()
    for order in range(6, 11):
        local_index = 0
        for graph in forests_without_isolates(order):
            if graph.number_of_edges() != 5:
                continue
            row = independence_row(graph)
            padded = {
                w[rank]: sp.expand(sum(
                    row[core_rank]*choose(padding, rank - core_rank)
                    for core_rank in range(min(rank, order) + 1)
                ))
                for rank in range(2, 9)
            }
            polynomial = sp.expand(q2.subs(padded, simultaneous=True))
            coefficients = binomial_coefficients(polynomial, padding)
            record = {
                "core_order": order,
                "core_index_within_order": local_index,
                "component_orders": list(component_orders(graph)),
                "degree_sequence": sorted((degree for _, degree in graph.degree()), reverse=True),
                "independence_row_0_through_8": list(row),
                "padding_polynomial": str(polynomial),
                "binomial_coefficients": list(map(str, coefficients)),
                "minimum_binomial_coefficient": str(min(coefficients)),
                "value_at_zero_padding": str(polynomial.subs(padding, 0)),
            }
            cores.append(record)
            stream.update((repr(record) + "\n").encode("ascii"))
            local_index += 1

    negative_coefficients = sum(
        1 if sp.Integer(value) < 0 else 0
        for record in cores for value in record["binomial_coefficients"]
    )
    report = {
        "marker": MARKER,
        "status": "exact bounded probe; promotion requires independent replay",
        "five_edge_isolate_free_cores": len(cores),
        "core_orders": [6, 10],
        "component_order_patterns": sorted({
            tuple(record["component_orders"]) for record in cores
        }, reverse=True),
        "negative_binomial_coefficients": negative_coefficients,
        "global_minimum_binomial_coefficient": str(min(
            sp.Integer(value)
            for record in cores for value in record["binomial_coefficients"]
        )),
        "cores": cores,
        "ordered_core_stream_sha256": stream.hexdigest().upper(),
        "g2_parent_report_sha256": sha256(parent_path),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "marker": MARKER,
        "five_edge_isolate_free_cores": len(cores),
        "negative_binomial_coefficients": negative_coefficients,
        "global_minimum_binomial_coefficient": str(report["global_minimum_binomial_coefficient"]),
        "ordered_core_stream_sha256": stream.hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
