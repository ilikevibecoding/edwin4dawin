#!/usr/bin/env python3
"""Solve the exact HCU scale interval for L + lambda*S0."""

from __future__ import annotations

from fractions import Fraction
import json
from pathlib import Path

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, q
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse, w, z
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal, shift_parameters
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import V


def schur_differences(source):
    groups = {}
    for (pz, pw, pc, pm, px), value in source.items():
        groups.setdefault((pc, pm, px, pz + pw), {})[pz] = value
    result = {}
    for (pc, pm, px, degree), row in groups.items():
        previous = 0
        for pz in range(degree // 2 + 1):
            current = row.get(pz, 0)
            result[(pc, pm, px, degree, pz)] = current - previous
            previous = current
    return result


def rational_record(value: Fraction | None):
    if value is None:
        return None
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
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
                s0 = quotient(reserve_reduced, z + w)
                ell_source, ell_degree = reciprocal(to_sparse(ell))
                s0_source, s0_degree = reciprocal(to_sparse(s0))
                assert ell_degree == s0_degree
                shift_c = 1 if package == "group" else 0
                ell_source = shift_parameters(ell_source, shift_c, 3)
                s0_source = shift_parameters(s0_source, shift_c, 3)
                ell_schur = schur_differences(ell_source)
                s0_schur = schur_differences(s0_source)
                keys = set(ell_schur) | set(s0_schur)
                lower = Fraction(0, 1)
                upper = None
                impossible = []
                s0_negative_count = 0
                for key in keys:
                    left = ell_schur.get(key, 0)
                    direction = s0_schur.get(key, 0)
                    if direction > 0 and left < 0:
                        lower = max(lower, Fraction(-left, direction))
                    elif direction == 0 and left < 0:
                        impossible.append({"key": list(key), "L_schur": left})
                    elif direction < 0:
                        s0_negative_count += 1
                        bound = Fraction(left, -direction)
                        if left < 0:
                            impossible.append(
                                {"key": list(key), "L_schur": left, "S0_schur": direction}
                            )
                        else:
                            upper = bound if upper is None else min(upper, bound)
                feasible = not impossible and (upper is None or lower <= upper)
                record = {
                    "package": package,
                    "parity": parity,
                    "coordinate": coordinate,
                    "reciprocal_bidegree": ell_degree,
                    "S0_negative_schur_count": s0_negative_count,
                    "HCU_scale_interval_nonempty": feasible,
                    "lambda_lower_bound": rational_record(lower),
                    "lambda_upper_bound": rational_record(upper),
                    "impossible_constraint_count": len(impossible),
                    "first_impossible_constraints": impossible[:10],
                }
                records.append(record)
                print(
                    package,
                    parity,
                    coordinate,
                    feasible,
                    float(lower),
                    None if upper is None else float(upper),
                    len(impossible),
                    s0_negative_count,
                    flush=True,
                )
    report = {
        "status": "PASS_HCU_SCALE_INTERVALS"
        if all(record["HCU_scale_interval_nonempty"] for record in records)
        else "NO_UNIFORM_HCU_SCALE",
        "records": records,
        "warning": "This audits only the HCU kernel half of the derivative split.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_l_plus_s0_hcu_"
        "20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
