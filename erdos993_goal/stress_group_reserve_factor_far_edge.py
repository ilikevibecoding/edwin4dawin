#!/usr/bin/env python3
"""Stress the full factored group reserve on the asymptotic x=2m,r=2m edge."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_group_reserve_factor_prefix_crosses import audit, sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, q, w, z


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "group_reserve_factor_far_edge_stress_20260802.json"
)


def main() -> None:
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    stages = [
        ("full_G2", (z + w) * (z**2 + w**2) * F * G**2),
    ]
    records = []
    for m in (240, 300):
        item = {"m": m, "x": 2 * m, "r": 2 * m, "stages": []}
        for name, expression in stages:
            result = audit(sparse(sp.expand(expression)), m, 2 * m, 2 * m)
            item["stages"].append({"stage": name, **result})
            print(m, name, result["negative_count"], flush=True)
        records.append(item)
    report = {
        "status": "GROUP_RESERVE_FACTOR_FAR_EDGE_STRESS",
        "records": records,
        "warning": "Finite exact coefficient evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
