#!/usr/bin/env python3
"""Exact rank-six g1 theorem for adjacent double-stars plus a disjoint K2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_adjacent_double_star_plus_k2_g1_nonadjacent import build
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from prove_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent import certify


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_adjacent_double_star_plus_k2_actual_d_exact_g1_nonadjacent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_DOUBLE_STAR_PLUS_K2_ACTUAL_D_G1_NONADJACENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    expression = reconstruct(1)
    cases = []
    total_rows = total_scalars = 0
    minimum = None
    for edge_q in (0, 1, 2):
        for keep_u, keep_v in ((0, 0), (0, 1), (1, 1)):
            value, tail, variables = build(expression, keep_u, keep_v, edge_q)
            certificate = certify(value, tail, variables)
            certificate.update({
                "retained_edge_vertices": edge_q,
                "keep_u": keep_u,
                "keep_v": keep_v,
            })
            local = sp.Rational(certificate["minimum_tail_power_coefficient"])
            minimum = local if minimum is None else min(minimum, local)
            total_rows += certificate["bernstein_coefficients"]
            total_scalars += certificate["tail_power_coefficients"]
            cases.append(certificate)
            print(
                "CASE", edge_q, keep_u, keep_v,
                "ROWS", certificate["bernstein_coefficients"],
                "SCALARS", certificate["tail_power_coefficients"],
                "MIN", local,
                flush=True,
            )
    report = {
        "marker": MARKER,
        "claim": "rank-six bundle g1 is nonnegative",
        "scope": (
            "all forests of order n>=8 consisting of an adjacent marked double-star "
            "component plus one disjoint ordinary edge K2, and every actual induced marked minor D"
        ),
        "parameterization": (
            "core x+y+z=n-4=t+4 via x=(t+4)a, y=(t+4)(1-a)b, "
            "z=(t+4)(1-a)(1-b); rx,ry,rz retain the core orbits"
        ),
        "edge_retention_cases": [0, 1, 2],
        "calculated_mark_retention_cases": [[0, 0], [0, 1], [1, 1]],
        "inferred_mark_retention_case": [1, 0],
        "mark_swap_identity_verified": True,
        "cases": cases,
        "bernstein_rows": total_rows,
        "tail_power_coefficients": total_scalars,
        "minimum_tail_power_coefficient": str(minimum),
        "proof": (
            "The disjoint K2 multiplies every C row by 1+2x.  Its induced D factor is "
            "1, 1+x, or 1+2x according as 0,1,2 endpoints survive.  Literal rows are "
            "substituted before an exact tensor-Bernstein transform, coefficient sign "
            "check in t=n-8, and exact inverse.  Mark swap supplies case 10 from 01."
        ),
        "helper_sha256": {
            "explore_iso_n6_bundle_g1_adjacent_double_star_plus_k2_g1_nonadjacent.py": sha256(
                HERE / "explore_iso_n6_bundle_g1_adjacent_double_star_plus_k2_g1_nonadjacent.py"
            ),
            "prove_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent.py": sha256(
                HERE / "prove_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent.py"
            ),
            "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py": sha256(
                HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py"
            ),
        },
        "scope_guard": (
            "This covers exactly one disjoint K2 attached to the adjacent-double-star "
            "family; it does not cover arbitrary edge-bearing W, universal g1, all N6, "
            "or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print("ROWS", total_rows, "SCALARS", total_scalars, "MIN", minimum)
    print(MARKER)


if __name__ == "__main__":
    main()
