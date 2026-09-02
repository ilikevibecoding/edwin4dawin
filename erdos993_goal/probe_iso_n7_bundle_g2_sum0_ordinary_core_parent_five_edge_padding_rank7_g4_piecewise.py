#!/usr/bin/env python3
"""Exact five-edge G2 padding probe when the ordinary parent lies in the core."""

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
    "probe_iso_n7_bundle_g2_sum0_ordinary_core_parent_five_edge_padding_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G2_SUM0_ORDINARY_CORE_PARENT_FIVE_"
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

    # W is the unmarked forest and Q is W-N[p].  Since both marked vertices
    # are isolated, the ordinary-parent occupation rows are exact shifts of Q.
    w = {rank: sp.Symbol(f"W{rank}") for rank in range(0, 9)}
    q = {rank: sp.Symbol(f"Q{rank}") for rank in range(0, 9)}
    q.update({rank: sp.Integer(0) for rank in range(-3, 0)})
    substitution = {}
    for rank in range(0, 9):
        substitution[symbols[f"W{rank}"]] = w[rank]
        substitution[symbols[f"A{rank}"]] = w[rank - 1] if rank >= 1 else 0
        substitution[symbols[f"B{rank}"]] = w[rank - 1] if rank >= 1 else 0
        substitution[symbols[f"Z{rank}"]] = w[rank - 2] if rank >= 2 else 0
        substitution[symbols[f"PW{rank}"]] = q[rank - 1]
        substitution[symbols[f"PA{rank}"]] = q[rank - 2]
        substitution[symbols[f"PB{rank}"]] = q[rank - 2]
        substitution[symbols[f"PZ{rank}"]] = q[rank - 3]
    reduced = sp.expand(ordinary.subs(substitution, simultaneous=True))
    assert all(str(value).startswith(("W", "Q")) for value in reduced.free_symbols)

    padding = sp.Symbol("padding", integer=True, nonnegative=True)
    placements = []
    stream = hashlib.sha256()
    core_count = 0
    for order in range(6, 11):
        local_index = 0
        for graph in forests_without_isolates(order):
            if graph.number_of_edges() != 5:
                continue
            core_count += 1
            row = independence_row(graph)
            padded_w = {
                w[rank]: sp.expand(sum(
                    row[core_rank]*choose(padding, rank - core_rank)
                    for core_rank in range(min(rank, order) + 1)
                ))
                for rank in range(1, 9)
            }
            for parent_vertex in sorted(graph.nodes()):
                closed_neighborhood = set(graph.neighbors(parent_vertex)) | {parent_vertex}
                remainder = graph.subgraph(
                    [vertex for vertex in graph if vertex not in closed_neighborhood]
                ).copy()
                qrow = independence_row(remainder)
                padded_q = {
                    q[rank]: sp.expand(sum(
                        qrow[core_rank]*choose(padding, rank - core_rank)
                        for core_rank in range(min(rank, remainder.number_of_nodes()) + 1)
                    ))
                    for rank in range(0, 8)
                }
                polynomial = sp.expand(reduced.subs(
                    {**padded_w, **padded_q}, simultaneous=True
                ))
                assert not polynomial.free_symbols - {padding}
                coefficients = binomial_coefficients(polynomial, padding)
                record = {
                    "core_order": order,
                    "core_index_within_order": local_index,
                    "component_orders": list(component_orders(graph)),
                    "degree_sequence": sorted(
                        (degree for _, degree in graph.degree()), reverse=True
                    ),
                    "parent_vertex": parent_vertex,
                    "parent_degree": graph.degree(parent_vertex),
                    "core_independence_row_0_through_8": list(row),
                    "deleted_closed_neighborhood_order": remainder.number_of_nodes(),
                    "deleted_closed_neighborhood_independence_row_0_through_8": list(qrow),
                    "padding_polynomial": str(polynomial),
                    "binomial_coefficients": list(map(str, coefficients)),
                    "minimum_binomial_coefficient": str(min(coefficients)),
                    "value_at_zero_padding": str(polynomial.subs(padding, 0)),
                }
                placements.append(record)
                stream.update((repr(record) + "\n").encode("ascii"))
            local_index += 1

    all_coefficients = [
        sp.Integer(value)
        for record in placements for value in record["binomial_coefficients"]
    ]
    all_zero_values = [
        sp.Integer(record["value_at_zero_padding"]) for record in placements
    ]
    report = {
        "marker": MARKER,
        "status": "exact bounded probe; promotion requires independent replay",
        "ordinary_core_parent_reduction": str(reduced),
        "row_identity": {
            "W": "independence rows of the unmarked five-edge core plus padding isolates",
            "Q": "independence rows of W-N[p]",
            "A_k_equals_B_k": "W_(k-1)",
            "Z_k": "W_(k-2)",
            "PW_k": "Q_(k-1)",
            "PA_k_equals_PB_k": "Q_(k-2)",
            "PZ_k": "Q_(k-3)",
        },
        "five_edge_isolate_free_cores": core_count,
        "literal_core_vertex_parent_placements": len(placements),
        "core_orders": [6, 10],
        "component_order_patterns": sorted({
            tuple(record["component_orders"]) for record in placements
        }, reverse=True),
        "negative_binomial_coefficients": sum(
            1 if value < 0 else 0 for value in all_coefficients
        ),
        "negative_values_at_zero_padding": sum(
            1 if value < 0 else 0 for value in all_zero_values
        ),
        "global_minimum_binomial_coefficient": str(min(all_coefficients)),
        "global_minimum_value_at_zero_padding": str(min(all_zero_values)),
        "placements": placements,
        "ordered_placement_stream_sha256": stream.hexdigest().upper(),
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
        "five_edge_isolate_free_cores": core_count,
        "literal_core_vertex_parent_placements": len(placements),
        "negative_binomial_coefficients": report["negative_binomial_coefficients"],
        "negative_values_at_zero_padding": report["negative_values_at_zero_padding"],
        "global_minimum_binomial_coefficient": report[
            "global_minimum_binomial_coefficient"
        ],
        "global_minimum_value_at_zero_padding": report[
            "global_minimum_value_at_zero_padding"
        ],
        "ordered_placement_stream_sha256": report[
            "ordered_placement_stream_sha256"
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
