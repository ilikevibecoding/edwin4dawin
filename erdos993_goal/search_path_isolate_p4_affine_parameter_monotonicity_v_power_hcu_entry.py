#!/usr/bin/env python3
"""Search uniform HCU entry after allocating outer V powers."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_affine_direct_integration_kernel import finite_kernel
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, m, q, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    hcu_audit,
    reciprocal,
    shift_parameters,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def multiply_w(source):
    result = {}
    for (pz, pw, pc, pm, px), value in source.items():
        for dz, dw in ((1, 0), (0, 1), (1, 1)):
            key = (pz + dz, pw + dw, pc, pm, px)
            result[key] = result.get(key, 0) + value
    return {key: value for key, value in result.items() if value}


def main() -> None:
    records = []
    for package, directions in (("group", ("x", "c", "m")), ("bottom", ("x", "m"))):
        for parity in (0, 1):
            for coordinate in directions:
                d_expression, reserve_expression = (
                    group_increment(parity, coordinate)
                    if package == "group"
                    else bottom_increment(parity, coordinate)
                )
                common = T**3 if package == "group" else q**2 * T**3
                d_reduced = quotient(d_expression, common)
                reserve_reduced = quotient(reserve_expression, common)
                a = 2 * c + m + x - 3 if package == "group" else m + x - 3
                b = (
                    2 * m + parity - 1
                    if package == "group"
                    else 2 * m + parity - 2
                )
                finite = finite_kernel(d_reduced, reserve_reduced, a, b, 1, 1)
                source, bidegree = reciprocal(to_sparse(finite))
                source = shift_parameters(source, 1 if package == "group" else 0, 3)
                trajectory = []
                entry = None
                for power in range(31):
                    audit = hcu_audit(source)
                    trajectory.append(
                        {
                            "V_power": power,
                            "negative_schur_coefficient_count": audit[
                                "negative_schur_coefficient_count"
                            ],
                            "symmetry_failure_count": audit["symmetry_failure_count"],
                            "minimum_difference": audit["minimum"]["difference"],
                        }
                    )
                    if audit["hcu"]:
                        entry = power
                        break
                    source = multiply_w(source)
                record = {
                    "package": package,
                    "parity": parity,
                    "coordinate": coordinate,
                    "initial_reciprocal_bidegree": bidegree,
                    "V_power_hcu_entry": entry,
                    "trajectory": trajectory,
                }
                records.append(record)
                print(
                    package,
                    parity,
                    coordinate,
                    entry,
                    trajectory[-1]["negative_schur_coefficient_count"],
                    trajectory[-1]["minimum_difference"],
                    flush=True,
                )
    report = {
        "status": "PASS_UNIFORM_V_POWER_HCU_ENTRY"
        if all(record["V_power_hcu_entry"] is not None for record in records)
        else "NO_ENTRY_THROUGH_30",
        "records": records,
        "warning": (
            "An HCU entry is only a candidate certificate until the precise "
            "integration exponent bookkeeping and all smaller orders are audited."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_v_power_hcu_entry_"
        "search_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
