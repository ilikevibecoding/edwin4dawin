#!/usr/bin/env python3
"""Search global cone entry for K_n=V^n L+n V^(n-1) S."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, q
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    hcu_audit,
    paired_cone_audit,
    reciprocal,
    shift_parameters,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


V_TERMS = ((0, 0), (1, 0), (0, 1))


def multiply_v(source):
    result = {}
    for (pz, pw, pc, pm, px), value in source.items():
        for dz, dw in V_TERMS:
            key = (pz + dz, pw + dw, pc, pm, px)
            result[key] = result.get(key, 0) + value
    return {key: value for key, value in result.items() if value}


def add(left, right, scalar=1):
    result = dict(left)
    for key, value in right.items():
        updated = result.get(key, 0) + scalar * value
        if updated:
            result[key] = updated
        elif key in result:
            del result[key]
    return result


def audit(source, c_shift):
    reversed_source, degree = reciprocal(source)
    shifted = shift_parameters(reversed_source, c_shift, 3)
    hcu = hcu_audit(shifted)
    paired = paired_cone_audit(shifted)
    return {
        "reciprocal_bidegree": degree,
        "hcu": hcu["hcu"],
        "negative_schur_coefficient_count": hcu[
            "negative_schur_coefficient_count"
        ],
        "in_paired_cone": paired["in_paired_cone"],
        "paired_cone_failure_count": paired["failure_count"],
    }


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
                ell = quotient(d_reduced - reserve_reduced, V)
                ell_source = to_sparse(ell)
                reserve_source = to_sparse(reserve_reduced)
                k_source = add(multiply_v(ell_source), reserve_source)
                v_power_reserve = reserve_source
                trajectory = []
                entry = None
                for n_value in range(1, 41):
                    result = audit(k_source, 1 if package == "group" else 0)
                    trajectory.append({"n": n_value, **result})
                    if result["hcu"] or result["in_paired_cone"]:
                        entry = {
                            "n": n_value,
                            "cone": "HCU" if result["hcu"] else "paired",
                        }
                        break
                    v_power_reserve = multiply_v(v_power_reserve)
                    k_source = add(multiply_v(k_source), v_power_reserve)
                record = {
                    "package": package,
                    "parity": parity,
                    "coordinate": coordinate,
                    "global_cone_entry": entry,
                    "trajectory": trajectory,
                }
                records.append(record)
                print(
                    package,
                    parity,
                    coordinate,
                    entry,
                    trajectory[-1]["negative_schur_coefficient_count"],
                    trajectory[-1]["paired_cone_failure_count"],
                    flush=True,
                )
    report = {
        "status": "PASS_REAGGREGATED_GLOBAL_CONE_ENTRY"
        if all(record["global_cone_entry"] is not None for record in records)
        else "NO_GLOBAL_CONE_ENTRY_THROUGH_40",
        "records": records,
        "warning": (
            "A positive search result still requires a formal proof that the "
            "chosen cone is preserved by the exact K_(n+1) recurrence."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "global_cone_entry_search_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
