#!/usr/bin/env python3
"""Verify the common-order transform for L and the marked reserve in all families."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, q, w, z
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def audit(package: str, parity: int, coordinate: str) -> dict:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    L = quotient(d_reduced - reserve_reduced, V)
    Q = quotient(reserve_reduced, T**2)
    q_over_1z = sp.cancel(Q / (1 + z))
    q_over_1w = sp.cancel(Q / (1 + w))
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "L_term_count": len(sp.Poly(L).terms()),
        "Q_term_count": len(sp.Poly(Q).terms()),
        "Q_divisible_by_1_plus_z": bool(q_over_1z.is_polynomial()),
        "Q_divisible_by_1_plus_w": bool(q_over_1w.is_polynomial()),
    }


def main() -> None:
    records = []
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            records.append(audit("group", parity, coordinate))
        for coordinate in ("x", "m"):
            records.append(audit("bottom", parity, coordinate))
    all_divisible = all(
        record["Q_divisible_by_1_plus_z"]
        and record["Q_divisible_by_1_plus_w"]
        for record in records
    )
    report = {
        "status": (
            "PASS_COMMON_ORDER_KERNEL_IDENTITY" if all_divisible else "FAIL"
        ),
        "identity": (
            "For n=r+1 and Phi_j(H)=C(n,j)[diag]A^aT^b "
            "w^j(1+z)^(n-j)H, L_j=Phi_j(L) and "
            "n R_j=(n-j)Phi_j(T^2 Q/(1+z))."
        ),
        "case_count": len(records),
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "common_order_kernel_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
