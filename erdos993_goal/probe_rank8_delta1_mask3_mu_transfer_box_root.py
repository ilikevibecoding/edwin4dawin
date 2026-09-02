#!/usr/bin/env python3
"""Exact diagnostic using the sharp mu4 path bound and mu4-to-mu5 transfer."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
from probe_rank8_delta1_mask3_shadow_adaptive_subdivision_root import (
    power_to_bernstein_fast,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_mu_transfer_box_probe_root_20260825.json"


def main() -> None:
    endpoint, metadata = corner.new_leaf_corner(1, 3)
    A, B, U4, U5, U6 = sp.symbols("A B U4 U5 U6", nonnegative=True)
    variables = (A, B, U4, U5, U6)
    rows = []
    for order in (26, 30, 40):
        N = sp.Integer(order)
        mu4_lower = sp.cancel((N - 7) * (N - 8) / (N - 3))
        mu4_upper = N - 4
        mu4 = mu4_lower + (mu4_upper - mu4_lower) * A
        mu5_lower = sp.cancel(mu4 - 3 + 2 / mu4)
        mu5_upper = N - 5
        mu5 = mu5_lower + (mu5_upper - mu5_lower) * B
        ratio45 = sp.cancel(5 / mu4)
        ratio56 = sp.cancel(6 / mu5)
        rational = sp.cancel(
            endpoint.subs(
                {
                    corner.leaf.d[6]: 1,
                    corner.leaf.d[5]: ratio56,
                    corner.leaf.d[4]: ratio56 * ratio45,
                    corner.leaf.f[6]: U6,
                    corner.leaf.f[5]: ratio56 * U5,
                    corner.leaf.f[4]: ratio56 * ratio45 * U4,
                },
                simultaneous=True,
            )
        )
        numerator, denominator = sp.fraction(rational)
        polynomial = sp.Poly(sp.expand(numerator), *variables, domain=sp.QQ)
        degrees, tensor = power_to_bernstein_fast(polynomial)
        minimum_index, minimum = min(tensor.items(), key=lambda item: item[1])
        negative = sum(value < 0 for value in tensor.values())
        corner_indices = list(
            __import__("itertools").product(*((0, degree) for degree in degrees))
        )
        negative_vertices = sum(tensor[index] < 0 for index in corner_indices)
        row = {
            "order_N": order,
            "mu4_interval": [str(mu4_lower), str(mu4_upper)],
            "mu5_interval": [str(mu5_lower), str(mu5_upper)],
            "positive_denominator": str(sp.factor(denominator)),
            "power_terms": len(polynomial.terms()),
            "degrees": list(degrees),
            "bernstein_coefficients": len(tensor),
            "negative": negative,
            "negative_vertices": negative_vertices,
            "minimum_index": list(minimum_index),
            "minimum": str(minimum),
        }
        rows.append(row)
        print(
            "N", order, "TERMS", len(polynomial.terms()),
            "DEGREES", list(degrees), "NEG", negative,
            "VERTEX_NEG", negative_vertices, "MIN", minimum, flush=True,
        )
    payload = {
        "schema": "rank8-delta1-mask3-mu-transfer-box-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "endpoint_names": metadata["endpoint_names"],
        "inputs": [
            "mu4 >= (N-7)(N-8)/(N-3)",
            "mu5 >= mu4-3+2/mu4",
            "mu4 <= N-4 and mu5 <= N-5",
            "0<=fi<=di for i=4,5,6",
        ],
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
