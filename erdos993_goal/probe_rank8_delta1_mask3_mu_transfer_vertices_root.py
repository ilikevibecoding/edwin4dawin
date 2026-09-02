#!/usr/bin/env python3
"""Enumerate exact endpoint vertices for the Delta1 mask-3 transfer probe.

This is diagnostic only.  It identifies which corners of the deliberately
relaxed containment cube are genuinely negative before stronger D/F coupling
constraints are imposed.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_mu_transfer_vertices_probe_root_20260825.json"


def main() -> None:
    endpoint, metadata = corner.new_leaf_corner(1, 3)
    rows = []
    for order in (26, 30, 40):
        N = sp.Integer(order)
        mu4_lower = sp.cancel((N - 7) * (N - 8) / (N - 3))
        mu4_values = (mu4_lower, N - 4)
        for a, mu4 in enumerate(mu4_values):
            mu5_lower = sp.cancel(mu4 - 3 + 2 / mu4)
            mu5_values = (mu5_lower, N - 5)
            for b, mu5 in enumerate(mu5_values):
                ratio45 = sp.cancel(5 / mu4)
                ratio56 = sp.cancel(6 / mu5)
                for u4, u5, u6 in itertools.product((0, 1), repeat=3):
                    value = sp.cancel(
                        endpoint.subs(
                            {
                                corner.leaf.d[6]: 1,
                                corner.leaf.d[5]: ratio56,
                                corner.leaf.d[4]: ratio56 * ratio45,
                                corner.leaf.f[6]: u6,
                                corner.leaf.f[5]: ratio56 * u5,
                                corner.leaf.f[4]: ratio56 * ratio45 * u4,
                            },
                            simultaneous=True,
                        )
                    )
                    if value < 0:
                        rows.append(
                            {
                                "order_N": order,
                                "corner": [a, b, u4, u5, u6],
                                "mu4": str(mu4),
                                "mu5": str(mu5),
                                "value": str(value),
                            }
                        )
    payload = {
        "schema": "rank8-delta1-mask3-mu-transfer-negative-vertices-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "endpoint_names": metadata["endpoint_names"],
        "negative_vertices": rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    for row in rows:
        print(row["order_N"], row["corner"], row["value"])
    print("NEGATIVE_VERTICES", len(rows))


if __name__ == "__main__":
    main()
