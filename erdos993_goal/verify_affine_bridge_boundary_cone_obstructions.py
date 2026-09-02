#!/usr/bin/env python3
"""Exact obstructions to several over-strong affine boundary cones."""

from __future__ import annotations

import json
import math
from pathlib import Path

from probe_affine_bridge_boundary_layer_cone import initial_outer
from probe_affine_bridge_shifted_predecessors import (
    A,
    T_dict,
    V_dict,
    evaluate,
    multiply,
    power,
    sources,
)


def symmetric_row(poly, total_degree: int) -> list[int]:
    ordinary = [
        poly.get((index, total_degree - index), 0)
        for index in range(total_degree + 1)
    ]
    coefficients = []
    for q_power in range(total_degree // 2 + 1):
        coefficients.append(
            ordinary[q_power]
            - sum(
                coefficients[prior]
                * math.comb(
                    total_degree - 2 * prior,
                    q_power - prior,
                )
                for prior in range(q_power)
            )
        )
    return coefficients


def main() -> None:
    base_source, reserve_source = sources("group", 0)

    # Smallest even group point, before the positive outer A^2 T^2.
    kernel = evaluate(base_source, 1, 3, 0, 40)
    maximum_z = max(power_z for power_z, _ in kernel)
    top_row = {
        power_w: value
        for (power_z, power_w), value in kernel.items()
        if power_z == maximum_z
    }
    assert maximum_z == 24
    assert top_row.get(0, 0) == 0
    assert top_row.get(1, 0) == -2

    persistence_checks = []
    for a_power in range(7):
        for t_power in range(7):
            smoothed = kernel
            cap = 24 + a_power + 2 * t_power
            for factor, exponent in ((A, a_power), (T_dict, t_power)):
                smoothed = multiply(smoothed, power(factor, exponent, cap), cap)
            value = smoothed.get((cap, 1), 0)
            assert value == -2
            persistence_checks.append({
                "A_power": a_power,
                "T_power": t_power,
                "coefficient_z_top_w1": value,
            })

    # The actual minimal outer source has its first negative target-relative
    # entries on the axes, well outside the central predecessor positions.
    _, outer_base, _ = initial_outer(
        "group", 0, (1, 3, 0), base_source, reserve_source, 40
    )
    baseline = 8
    axial_window = []
    for shift_z in range(11):
        for shift_w in range(11):
            value = outer_base.get(
                (baseline + shift_z, baseline + shift_w), 0
            )
            if value < 0:
                axial_window.append({
                    "shift_z": shift_z,
                    "shift_w": shift_w,
                    "value": value,
                })
    assert axial_window == [
        {"shift_z": 0, "shift_w": 8, "value": -12301144},
        {"shift_z": 0, "shift_w": 9, "value": -30645796},
        {"shift_z": 0, "shift_w": 10, "value": -764681},
        {"shift_z": 8, "shift_w": 0, "value": -12301144},
        {"shift_z": 9, "shift_w": 0, "value": -30645796},
        {"shift_z": 10, "shift_w": 0, "value": -764681},
    ]

    # Ordinary symmetric generators s=z+w, q=zw do not make even the first
    # predecessor source coefficientwise positive.
    degree = 17
    sq_coefficients = symmetric_row(outer_base, degree)
    weights = [
        math.comb(degree - 2 * q_power, 9 - q_power)
        for q_power in range(degree // 2 + 1)
    ]
    weighted_terms = [
        coefficient * weight
        for coefficient, weight in zip(sq_coefficients, weights)
    ]
    assert sq_coefficients == [
        0, 4870, -40854, 127274, -178855, 108868, -21040, 0, 0
    ]
    assert sum(weighted_terms) == outer_base[(9, 8)] == 1097824

    # The reserve-free individual predecessor is also false.  At x=4,
    # propagate to r=7 and inspect the diagonal shifted predecessor V.
    _, base_x4, reserve_x4 = initial_outer(
        "group", 0, (1, 3, 4), base_source, reserve_source, 30
    )
    for _ in range(7):
        base_x4 = multiply(base_x4, V_dict, 30)
        reserve_x4 = multiply(reserve_x4, V_dict, 30)
    target = 3 + 7 + 5
    base_v = base_x4.get((target + 1, target + 1), 0)
    reserve_v = reserve_x4.get((target + 1, target + 1), 0)
    combined_v = base_v + 7 * reserve_v
    assert base_v == -7741670279776
    assert reserve_v == 177406601640576
    assert combined_v == 1234104541204256

    report = {
        "status": "PASS_AFFINE_BRIDGE_BOUNDARY_CONE_OBSTRUCTIONS",
        "persistent_top_row_counterexample": {
            "package": "group",
            "parity": 0,
            "parameters": {"c": 1, "m": 3, "x": 0},
            "kernel_maximum_z_degree": maximum_z,
            "top_z_row_w0": top_row.get(0, 0),
            "top_z_row_w1": top_row.get(1, 0),
            "all_order_identity": (
                "[z^(24+u+2v)w] A^u T^v B = -2 for all u,v>=0"
            ),
            "reason": (
                "The top-z term of A^uT^v is z^(u+2v)(1+w)^u, "
                "while the B top-z row has w^0 coefficient 0 and w^1 "
                "coefficient -2."
            ),
            "finite_transcription_checks": persistence_checks,
        },
        "minimal_outer_axial_counterexample": {
            "outer": "A^2 T^2 B",
            "baseline_target": [8, 8],
            "negative_entries_in_shift_box_0_to_10": axial_window,
        },
        "symmetric_generator_counterexample": {
            "basis": "s=z+w, q=zw",
            "homogeneous_total_degree": degree,
            "sq_coefficients": sq_coefficients,
            "central_adjacent_weights": weights,
            "weighted_terms": weighted_terms,
            "positive_final_coefficient": sum(weighted_terms),
            "conclusion": (
                "Coefficientwise positivity in the symmetric s,q basis is "
                "false even though the desired adjacent coefficient is positive."
            ),
        },
        "reserve_free_predecessor_counterexample": {
            "package": "group",
            "parity": 0,
            "parameters": {"c": 1, "m": 3, "x": 4, "r": 7},
            "predecessor": "V_r=F_r(N-1,N-1)",
            "base_only": base_v,
            "reserve_unit": reserve_v,
            "combined_base_plus_r_reserve": combined_v,
        },
        "conclusion": (
            "A proof cannot use whole-source coefficientwise positivity, a "
            "fixed A,T smoothing of that source, coefficientwise positivity "
            "in the elementary symmetric basis, or the signed base without "
            "its rP reserve."
        ),
    }
    output = Path("affine_bridge_boundary_cone_obstructions_exact_20260810.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "persistent_checks": len(persistence_checks),
        "axial_negative_count": len(axial_window),
        "base_only_counterexample": base_v,
        "output": str(output),
    }, indent=2))


if __name__ == "__main__":
    main()
