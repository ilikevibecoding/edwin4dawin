#!/usr/bin/env python3
"""Two-condition ground-root certificate in compact reserve coordinates."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import hstack

from search_bounded_reserve_conditional_bernstein import (
    bernstein_controls,
    compactified_power,
    product_matrix,
)


def negate(value: str) -> str:
    return value[1:] if value.startswith("-") else "-" + value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--r0", type=int, default=0)
    parser.add_argument("--c-max", type=float, default=2.0)
    parser.add_argument("--uv-max", type=float, default=1.0)
    parser.add_argument("--extra", type=int, default=0)
    parser.add_argument("--time-limit", type=float, default=600.0)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    moment_path = Path(f"{args.parity}_symbolic_reduced_moment_numerator_20260806.json")
    if args.parity == "odd" and not moment_path.exists():
        moment_path = Path("odd_symbolic_reduced_moment_numerator_20260806.json")
    moment = json.loads(moment_path.read_text())
    invariant = json.loads(
        Path(f"combined_ground_root_invariant_{args.parity}_exact_20260806.json").read_text()
    )
    sign_factor = max(
        invariant["numerator_factorization"]["factors"], key=lambda item: item["terms"]
    )
    sign_degrees = tuple(sign_factor["degrees_r_u_v_c"])
    condition_degrees = tuple(moment["condition_degrees"])
    target_degrees = tuple(value + args.extra for value in sign_degrees)
    sign_multiplier_degrees = tuple(
        target_degrees[axis] - sign_degrees[axis] for axis in range(4)
    )
    condition_multiplier_degrees = tuple(
        target_degrees[axis] - condition_degrees[axis] for axis in range(4)
    )
    target = bernstein_controls(
        compactified_power(
            moment["moment_reduced_numerator"],
            target_degrees,
            args.r0,
            args.c_max,
            args.uv_max,
        ),
        target_degrees,
    )
    sign = bernstein_controls(
        compactified_power(
            sign_factor["polynomial"],
            sign_degrees,
            args.r0,
            args.c_max,
            args.uv_max,
        ),
        sign_degrees,
    )
    condition = bernstein_controls(
        compactified_power(
            moment["condition_numerator"],
            condition_degrees,
            args.r0,
            args.c_max,
            args.uv_max,
        ),
        condition_degrees,
    )
    target_scale = np.max(np.abs(target))
    sign_scale = np.max(np.abs(sign))
    condition_scale = np.max(np.abs(condition))
    ms, ps, gs = (
        target / target_scale,
        sign / sign_scale,
        condition / condition_scale,
    )
    sign_product = product_matrix(ps, sign_multiplier_degrees).tocsr()
    condition_product = product_matrix(gs, condition_multiplier_degrees).tocsr()
    # M = R + P*Qp + (-g)*Qg, so P*Qp-g*Qg <= M.
    matrix = hstack([sign_product, -condition_product], format="csr")
    row_max = np.maximum(
        np.abs(ms.ravel()),
        np.asarray(np.abs(matrix).max(axis=1).toarray()).ravel(),
    )
    row_max[row_max == 0.0] = 1.0
    normalized_matrix = matrix.multiply((1.0 / row_max)[:, None]).tocsr()
    normalized_target = ms.ravel() / row_max
    result = linprog(
        np.ones(matrix.shape[1]),
        A_ub=normalized_matrix,
        b_ub=normalized_target,
        bounds=(0, None),
        method="highs",
        options={
            "dual_feasibility_tolerance": 1e-9,
            "primal_feasibility_tolerance": 1e-9,
            "time_limit": args.time_limit,
        },
    )
    p_shape = tuple(value + 1 for value in sign_multiplier_degrees)
    p_count = int(np.prod(p_shape))
    g_shape = tuple(value + 1 for value in condition_multiplier_degrees)
    report = {
        "status": "feasible" if result.success else "infeasible_or_unresolved",
        "message": result.message,
        "parity": args.parity,
        "identity": "compact(M)=R+compact(P)*Qp+(-compact(g0))*Qg",
        "compactification": f"r={args.r0}+z/(1-z)",
        "c_max": args.c_max,
        "uv_max": args.uv_max,
        "target_degrees_z_u_v_c": target_degrees,
        "invariant_multiplier_degrees_z_u_v_c": sign_multiplier_degrees,
        "condition_multiplier_degrees_z_u_v_c": condition_multiplier_degrees,
        "constraint_count": matrix.shape[0],
        "variable_count": matrix.shape[1],
        "nonzero_matrix_entries": matrix.nnz,
    }
    if result.success:
        variables = result.x
        remainder = ms.ravel() - matrix @ variables
        report.update(
            {
                "objective": float(result.fun),
                "minimum_remainder_control": float(np.min(remainder)),
                "minimum_normalized_remainder_control": float(np.min(remainder / row_max)),
                "positive_invariant_multiplier_controls": int(
                    np.sum(variables[:p_count] > 1e-12)
                ),
                "positive_condition_multiplier_controls": int(
                    np.sum(variables[p_count:] > 1e-12)
                ),
                "invariant_multiplier_controls_scaled": [
                    {
                        "index": [int(value) for value in np.unravel_index(index, p_shape)],
                        "value": float(value),
                    }
                    for index, value in enumerate(variables[:p_count])
                    if value > 1e-12
                ],
                "condition_multiplier_controls_scaled": [
                    {
                        "index": [int(value) for value in np.unravel_index(index, g_shape)],
                        "value": float(value),
                    }
                    for index, value in enumerate(variables[p_count:])
                    if value > 1e-12
                ],
                "target_scale": float(target_scale),
                "invariant_scale": float(sign_scale),
                "condition_scale": float(condition_scale),
            }
        )
    output = args.output or Path(
        f"compact_combined_ground_root_{args.parity}_lp_20260806.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {
                key: value
                for key, value in report.items()
                if key
                not in (
                    "invariant_multiplier_controls_scaled",
                    "condition_multiplier_controls_scaled",
                )
            },
            indent=2,
        )
    )
    print(output)


if __name__ == "__main__":
    main()
