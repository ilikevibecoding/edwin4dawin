#!/usr/bin/env python3
"""Exact five-edge G2 padding probe when the ordinary parent is isolated."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise import (
    forests_without_isolates,
)
from probe_iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_rank7_g4_piecewise import (
    binomial_coefficients,
    choose,
    component_orders,
    independence_row,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g2_sum0_ordinary_isolate_parent_five_edge_padding_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G2_SUM0_ORDINARY_ISOLATE_PARENT_FIVE_"
    "EDGE_PADDING_RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parent_path = HERE / "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json"
    parent = json.loads(parent_path.read_text(encoding="utf-8"))
    assert parent["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_G2_PARENT_MODES_RANK7_G5_FINISH"

    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}")
        for family in "WABZ" for rank in range(0, 9)
    }
    symbols.update({
        f"P{family}{rank}": sp.Symbol(f"P{family}{rank}")
        for family in "WABZ" for rank in range(0, 9)
    })
    ordinary = sp.expand(sp.sympify(
        parent["modes"]["ordinary_parent"]["expression"], locals=symbols
    ))

    # X_k counts independent k-sets after deleting the distinguished isolated
    # ordinary parent p.  Before deletion W=(1+x)X.  The two marked vertices
    # u,v are also isolated and distinct, so every marked/occupied row is an
    # exact shift of X.
    x = {rank: sp.Symbol(f"X{rank}") for rank in range(0, 9)}
    x.update({rank: sp.Integer(0) for rank in range(-3, 0)})
    substitution = {}
    for rank in range(0, 9):
        substitution[symbols[f"W{rank}"]] = x[rank] + x[rank - 1]
        substitution[symbols[f"A{rank}"]] = x[rank - 1] + x[rank - 2]
        substitution[symbols[f"B{rank}"]] = x[rank - 1] + x[rank - 2]
        substitution[symbols[f"Z{rank}"]] = x[rank - 2] + x[rank - 3]
        substitution[symbols[f"PW{rank}"]] = x[rank - 1]
        substitution[symbols[f"PA{rank}"]] = x[rank - 2]
        substitution[symbols[f"PB{rank}"]] = x[rank - 2]
        substitution[symbols[f"PZ{rank}"]] = x[rank - 3]
    reduced = sp.expand(ordinary.subs(substitution, simultaneous=True))
    reduced_symbols = sorted(map(str, reduced.free_symbols))
    assert reduced_symbols == [f"X{k}" for k in range(1, 9)], reduced_symbols

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
                x[rank]: sp.expand(sum(
                    row[core_rank]*choose(padding, rank - core_rank)
                    for core_rank in range(min(rank, order) + 1)
                ))
                for rank in range(1, 9)
            }
            polynomial = sp.expand(reduced.subs(padded, simultaneous=True))
            coefficients = binomial_coefficients(polynomial, padding)
            record = {
                "core_order": order,
                "core_index_within_order": local_index,
                "component_orders": list(component_orders(graph)),
                "independence_row_0_through_8": list(row),
                "padding_polynomial": str(polynomial),
                "binomial_coefficients": list(map(str, coefficients)),
                "minimum_binomial_coefficient": str(min(coefficients)),
                "value_at_zero_padding": str(polynomial.subs(padding, 0)),
            }
            cores.append(record)
            stream.update((repr(record) + "\n").encode("ascii"))
            local_index += 1

    all_coefficients = [
        sp.Integer(value)
        for record in cores for value in record["binomial_coefficients"]
    ]
    report = {
        "marker": MARKER,
        "status": "exact bounded probe; promotion requires independent replay",
        "ordinary_isolated_parent_reduction": str(reduced),
        "ordinary_isolated_parent_reduction_symbols": reduced_symbols,
        "row_identity": {
            "X": "independence rows after deleting isolated ordinary parent p",
            "W_k": "X_k+X_(k-1)",
            "A_k_equals_B_k": "X_(k-1)+X_(k-2)",
            "Z_k": "X_(k-2)+X_(k-3)",
            "PW_k": "X_(k-1)",
            "PA_k_equals_PB_k": "X_(k-2)",
            "PZ_k": "X_(k-3)",
        },
        "five_edge_isolate_free_cores": len(cores),
        "core_orders": [6, 10],
        "component_order_patterns": sorted({
            tuple(record["component_orders"]) for record in cores
        }, reverse=True),
        "negative_binomial_coefficients": sum(
            1 if value < 0 else 0 for value in all_coefficients
        ),
        "global_minimum_binomial_coefficient": str(min(all_coefficients)),
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
        "negative_binomial_coefficients": report["negative_binomial_coefficients"],
        "global_minimum_binomial_coefficient": report[
            "global_minimum_binomial_coefficient"
        ],
        "ordered_core_stream_sha256": report["ordered_core_stream_sha256"],
        "reduced_expression": str(reduced),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
