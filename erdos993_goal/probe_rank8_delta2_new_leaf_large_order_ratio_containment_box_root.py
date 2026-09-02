#!/usr/bin/env python3
"""Exact diagnostic box for the sole Delta2 new-leaf Q endpoint."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
from probe_rank8_delta1_mask3_shadow_adaptive_subdivision_root import power_to_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_new_leaf_large_order_ratio_containment_box_probe_root_20260825.json"


def main() -> None:
    numerator, metadata = corner.new_leaf_corner(2, 3)
    R3, R4, R5, U3, U4, U5, U6 = sp.symbols(
        "R3 R4 R5 U3 U4 U5 U6", nonnegative=True
    )
    variables = (R3, R4, R5, U3, U4, U5, U6)
    rows = []
    for order in (26, 40, 180):
        N = sp.Integer(order)
        upper5 = sp.cancel(6 * N / (N**2 - 15 * N + 10))
        upper4 = sp.cancel(5 * N / (N**2 - 12 * N + 8))
        upper3 = sp.cancel(4 * N / (N**2 - 9 * N + 6))
        lower5 = sp.cancel(6 / (N - 5))
        lower4 = sp.cancel(5 / (N - 4))
        lower3 = sp.cancel(4 / (N - 3))
        ratio5 = lower5 + (upper5 - lower5) * R5
        ratio4 = lower4 + (upper4 - lower4) * R4
        ratio3 = lower3 + (upper3 - lower3) * R3
        d6 = sp.Integer(1)
        d5 = ratio5
        d4 = d5 * ratio4
        d3 = d4 * ratio3
        normalized = sp.expand(
            numerator.subs(
                {
                    corner.leaf.d[6]: d6,
                    corner.leaf.d[5]: d5,
                    corner.leaf.d[4]: d4,
                    corner.leaf.d[3]: d3,
                    corner.leaf.f[6]: d6 * U6,
                    corner.leaf.f[5]: d5 * U5,
                    corner.leaf.f[4]: d4 * U4,
                    corner.leaf.f[3]: d3 * U3,
                },
                simultaneous=True,
            )
        )
        polynomial = sp.Poly(normalized, *variables, domain=sp.QQ)
        degrees, tensor = power_to_bernstein(polynomial)
        minimum_index, minimum = min(tensor.items(), key=lambda item: item[1])
        negative = sum(value < 0 for value in tensor.values())
        row = {
            "order_N": order,
            "ratio_intervals": {
                "d5_over_d6": [str(lower5), str(upper5)],
                "d4_over_d5": [str(lower4), str(upper4)],
                "d3_over_d4": [str(lower3), str(upper3)],
            },
            "power_terms": len(polynomial.terms()),
            "degrees": list(degrees),
            "bernstein_coefficients": len(tensor),
            "negative": negative,
            "minimum_index": list(minimum_index),
            "minimum": str(minimum),
        }
        rows.append(row)
        print(
            "N", order, "TERMS", len(polynomial.terms()),
            "COEFFS", len(tensor), "NEG", negative,
            "MIN", minimum, flush=True,
        )
    payload = {
        "schema": "rank8-delta2-new-leaf-large-order-ratio-containment-box-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "endpoint_names": metadata["endpoint_names"],
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
