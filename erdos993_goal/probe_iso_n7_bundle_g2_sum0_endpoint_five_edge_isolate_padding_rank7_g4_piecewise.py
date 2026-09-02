#!/usr/bin/env python3
"""Exact padding probe for both endpoint modes in the five-edge sum0 G2 cell."""

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
    "probe_iso_n7_bundle_g2_sum0_endpoint_five_edge_isolate_padding_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G2_SUM0_ENDPOINT_FIVE_EDGE_ISOLATE_"
    "PADDING_RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parent_path = HERE / "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json"
    parent = json.loads(parent_path.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}")
        for family in "WABZ" for rank in range(1, 9)
    }
    shifts = {
        symbols[f"A{rank}"]: symbols[f"W{rank - 1}"] for rank in range(3, 9)
    }
    shifts.update({
        symbols[f"B{rank}"]: symbols[f"W{rank - 1}"] for rank in range(3, 9)
    })
    shifts.update({
        symbols[f"Z{rank}"]: symbols[f"W{rank - 2}"] for rank in range(4, 9)
    })
    reduced = {}
    for mode in ("endpoint_u", "endpoint_v"):
        expression = sp.expand(sp.sympify(
            parent["modes"][mode]["expression"], locals=symbols
        ))
        reduced[mode] = sp.expand(expression.subs(shifts, simultaneous=True))
    assert sp.expand(reduced["endpoint_u"] - reduced["endpoint_v"]) == 0
    w = {rank: symbols[f"W{rank}"] for rank in range(2, 9)}
    endpoint_q2 = sp.expand(
        12*w[2]*w[3] + 18*w[2]*w[4] - 51*w[2]*w[5]
        - 99*w[2]*w[6] - 51*w[2]*w[7] - 8*w[2]*w[8]
        + 26*w[3]**2 + 87*w[3]*w[4] - 14*w[3]*w[5]
        - 63*w[3]*w[6] - 18*w[3]*w[7] + 85*w[4]**2
        + 66*w[4]*w[5] + 10*w[5]**2
    )
    assert sp.expand(reduced["endpoint_u"] - endpoint_q2) == 0

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
            polynomial = sp.expand(endpoint_q2.subs(padded, simultaneous=True))
            coefficients = binomial_coefficients(polynomial, padding)
            record = {
                "core_order": order,
                "core_index_within_order": local_index,
                "component_orders": list(component_orders(graph)),
                "independence_row_0_through_8": list(row),
                "padding_polynomial": str(polynomial),
                "binomial_coefficients": list(map(str, coefficients)),
                "minimum_binomial_coefficient": str(min(coefficients)),
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
        "endpoint_u_v_symbolically_identical": True,
        "five_edge_isolate_free_cores": len(cores),
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
        "endpoint_u_v_symbolically_identical": True,
        "negative_binomial_coefficients": report["negative_binomial_coefficients"],
        "global_minimum_binomial_coefficient": report["global_minimum_binomial_coefficient"],
        "ordered_core_stream_sha256": report["ordered_core_stream_sha256"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
