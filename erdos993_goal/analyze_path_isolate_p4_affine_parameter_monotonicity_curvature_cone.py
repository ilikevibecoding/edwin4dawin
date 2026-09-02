#!/usr/bin/env python3
"""Test a larger HCU-plus-diagonal-curvature cone for finite kernels."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from scipy.optimize import linprog

from analyze_path_isolate_p4_affine_direct_integration_kernel import finite_kernel
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, m, q, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal, shift_parameters
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def curvature_feasible(row: list[int], include_paired: bool = False) -> dict:
    degree = len(row) - 1
    center = degree // 2
    p_schur = []
    previous = 0
    for index in range(center + 1):
        p_schur.append(row[index] - previous)
        previous = row[index]
    if degree < 2 and not include_paired:
        return {
            "feasible": all(value >= 0 for value in p_schur),
            "minimum_H_schur": min(p_schur),
            "F_schur_coefficients_approx": [],
        }
    f_center = (degree - 2) // 2
    curvature_variable_count = max(0, f_center + 1)

    def full_f(column: int) -> list[int]:
        # The column is the HCU/Schur atom whose edge differences have one
        # unit at `column`; reflect its cumulative row about the center.
        edge = [1 if index >= column else 0 for index in range(f_center + 1)]
        return [edge[min(index, degree - 2 - index)] for index in range(degree - 1)]

    matrix = np.zeros((center + 1, curvature_variable_count), dtype=float)
    for column in range(curvature_variable_count):
        f = full_f(column)
        h_adjustment = []
        for index in range(degree + 1):
            h_adjustment.append(
                (f[index - 2] if 0 <= index - 2 < len(f) else 0)
                - 2 * (f[index - 1] if 0 <= index - 1 < len(f) else 0)
                + (f[index] if index < len(f) else 0)
            )
        previous = 0
        for index in range(center + 1):
            matrix[index, column] = h_adjustment[index] - previous
            previous = h_adjustment[index]
    atom_columns = []
    if include_paired:
        parity_power = degree % 2
        half = (degree - parity_power) // 2
        for a_value in range(half + 1):
            b_value = half - a_value
            atom_row = [0] * (degree + 1)
            for j_value in range(b_value + 1):
                coefficient = math.comb(b_value, j_value)
                base = a_value + 2 * j_value
                atom_row[base] += coefficient
                if parity_power:
                    atom_row[base + 1] += coefficient
            atom_schur = []
            previous = 0
            for index in range(center + 1):
                atom_schur.append(atom_row[index] - previous)
                previous = atom_row[index]
            atom_columns.append(atom_schur)
    atom_matrix = (
        np.asarray(atom_columns, dtype=float).T
        if atom_columns
        else np.zeros((center + 1, 0), dtype=float)
    )
    constraint_matrix = np.concatenate((-matrix, atom_matrix), axis=1)
    variable_count = constraint_matrix.shape[1]
    scale = max(1.0, max(abs(value) for value in p_schur))
    result = linprog(
        c=np.ones(variable_count),
        A_ub=constraint_matrix,
        b_ub=np.asarray(p_schur, dtype=float) / scale,
        bounds=[(0, None)] * variable_count,
        method="highs",
    )
    if not result.success:
        return {
            "feasible": False,
            "minimum_H_schur": min(p_schur),
            "solver_status": int(result.status),
            "solver_message": result.message,
        }
    curvature_solution = result.x[:curvature_variable_count]
    atom_solution = result.x[curvature_variable_count:]
    residual = (
        np.asarray(p_schur, dtype=float)
        + scale * (matrix @ curvature_solution)
        - scale * (atom_matrix @ atom_solution)
    )
    return {
        "feasible": bool(np.min(residual) >= -1e-7 * scale),
        "minimum_H_schur": float(np.min(residual)),
        "F_schur_coefficients_approx": [
            float(scale * value) for value in curvature_solution
        ],
        "paired_atom_coefficients_approx": [
            float(scale * value) for value in atom_solution
        ],
    }


def cone_audit(source, include_paired: bool = False) -> dict:
    groups = {}
    for (pz, pw, pc, pm, px), value in source.items():
        groups.setdefault((pc, pm, px, pz + pw), {})[pz] = value
    failures = []
    feasible_count = 0
    for (pc, pm, px, degree), lookup in groups.items():
        row = [lookup.get(index, 0) for index in range(degree + 1)]
        audit = curvature_feasible(row, include_paired)
        if audit["feasible"]:
            feasible_count += 1
        else:
            failures.append(
                {
                    "parameter_powers_C_M_x": [pc, pm, px],
                    "degree": degree,
                    **audit,
                }
            )
    return {
        "in_curvature_cone_numerically": not failures,
        "row_count": len(groups),
        "feasible_row_count": feasible_count,
        "failure_count": len(failures),
        "first_failures": failures[:20],
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
                a = 2 * c + m + x - 3 if package == "group" else m + x - 3
                b = 2 * m + parity - 1 if package == "group" else 2 * m + parity - 2
                finite = finite_kernel(d_reduced, reserve_reduced, a, b, 1, 1)
                source, bidegree = reciprocal(to_sparse(finite))
                source = shift_parameters(source, 1 if package == "group" else 0, 3)
                audit = cone_audit(source)
                paired_audit = cone_audit(source, include_paired=True)
                record = {
                    "package": package,
                    "parity": parity,
                    "coordinate": coordinate,
                    "reciprocal_bidegree": bidegree,
                    **audit,
                    "in_paired_curvature_cone_numerically": paired_audit[
                        "in_curvature_cone_numerically"
                    ],
                    "paired_curvature_failure_count": paired_audit[
                        "failure_count"
                    ],
                    "paired_curvature_first_failures": paired_audit[
                        "first_failures"
                    ],
                }
                records.append(record)
                print(
                    package,
                    parity,
                    coordinate,
                    audit["in_curvature_cone_numerically"],
                    audit["failure_count"],
                    paired_audit["in_curvature_cone_numerically"],
                    paired_audit["failure_count"],
                    flush=True,
                )
    report = {
        "status": "NUMERICAL_PAIRED_CURVATURE_CONE_ENTRY"
        if all(
            record["in_paired_curvature_cone_numerically"]
            for record in records
        )
        else "PAIRED_CURVATURE_CONE_FAILURE",
        "records": records,
        "warning": (
            "Floating-point LP feasibility is exploratory only. Any successful "
            "row requires an exact rational certificate and a full bookkeeping proof."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_curvature_cone_"
        "analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
