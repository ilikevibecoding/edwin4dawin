#!/usr/bin/env python3
"""Combined certificate in symmetric (s=u+v, q=uv) coordinates.

On u+v<=s_max write s=s_max*x and q=s^2*y/4.  Then x,y lie in [0,1]
and every nonnegative pair u,v with that sum is represented.  The reserve is
also compactified by r=r0+z/(1-z).
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import hstack

from search_bounded_reserve_conditional_bernstein import (
    bernstein_controls,
    product_matrix,
)


def fraction(value: str) -> Fraction:
    return Fraction(value)


def power_sum_table(maximum: int):
    # p_d=u^d+v^d in Q[s,q].
    table = [{(0, 0): 2}, {(1, 0): 1}]
    for _ in range(2, maximum + 1):
        previous, previous2 = table[-1], table[-2]
        current = {}
        for (s_power, q_power), coefficient in previous.items():
            current[(s_power + 1, q_power)] = current.get(
                (s_power + 1, q_power), 0
            ) + coefficient
        for (s_power, q_power), coefficient in previous2.items():
            current[(s_power, q_power + 1)] = current.get(
                (s_power, q_power + 1), 0
            ) - coefficient
        table.append(current)
    return table


def symmetric_records(records):
    raw = {
        tuple(map(int, exponent)): fraction(str(coefficient))
        for exponent, coefficient in records
    }
    maximum_difference = max(abs(exponent[1] - exponent[2]) for exponent in raw)
    powers = power_sum_table(maximum_difference)
    output = {}
    for (r_power, u_power, v_power, c_power), coefficient in raw.items():
        if u_power < v_power:
            continue
        if u_power == v_power:
            key = (r_power, 0, u_power, c_power)
            output[key] = output.get(key, Fraction(0)) + coefficient
            continue
        counterpart = raw.get((r_power, v_power, u_power, c_power))
        if counterpart != coefficient:
            raise ValueError("polynomial is not symmetric in u,v")
        base_q = v_power
        for (s_power, q_power), integer in powers[u_power - v_power].items():
            key = (r_power, s_power, base_q + q_power, c_power)
            output[key] = output.get(key, Fraction(0)) + coefficient * integer
    return output


def mapped_compact_power(records, degrees, r0, s_max, c_max):
    symmetric = symmetric_records(records)
    output = np.zeros(tuple(value + 1 for value in degrees), dtype=float)
    reserve_degree = degrees[0]
    for (i, s_power, q_power, c_power), coefficient_exact in symmetric.items():
        x_power = s_power + 2 * q_power
        y_power = q_power
        coefficient = float(coefficient_exact)
        coefficient *= s_max**x_power * 4.0 ** (-q_power) * c_max**c_power
        for a in range(i + 1):
            first = comb(i, a) * r0 ** (i - a) * (1 - r0) ** a
            for b in range(reserve_degree - i + 1):
                output[a + b, x_power, y_power, c_power] += (
                    coefficient
                    * first
                    * comb(reserve_degree - i, b)
                    * (-1) ** b
                )
    return output


def mapped_degrees(records):
    symmetric = symmetric_records(records)
    return (
        max(key[0] for key in symmetric),
        max(key[1] + 2 * key[2] for key in symmetric),
        max(key[2] for key in symmetric),
        max(key[3] for key in symmetric),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--r0", type=int, default=0)
    parser.add_argument("--s-max", type=float, default=0.5)
    parser.add_argument("--c-max", type=float, default=2.0)
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
    moment_records = moment["moment_reduced_numerator"]
    condition_records = moment["condition_numerator"]
    sign_records = sign_factor["polynomial"]
    sign_degrees = mapped_degrees(sign_records)
    condition_degrees = mapped_degrees(condition_records)
    target_degrees = tuple(value + args.extra for value in sign_degrees)
    sign_multiplier_degrees = tuple(
        target_degrees[axis] - sign_degrees[axis] for axis in range(4)
    )
    condition_multiplier_degrees = tuple(
        target_degrees[axis] - condition_degrees[axis] for axis in range(4)
    )
    target = bernstein_controls(
        mapped_compact_power(
            moment_records,
            target_degrees,
            args.r0,
            args.s_max,
            args.c_max,
        ),
        target_degrees,
    )
    sign = bernstein_controls(
        mapped_compact_power(
            sign_records,
            sign_degrees,
            args.r0,
            args.s_max,
            args.c_max,
        ),
        sign_degrees,
    )
    condition = bernstein_controls(
        mapped_compact_power(
            condition_records,
            condition_degrees,
            args.r0,
            args.s_max,
            args.c_max,
        ),
        condition_degrees,
    )
    target_scale = np.max(np.abs(target))
    sign_scale = np.max(np.abs(sign))
    condition_scale = np.max(np.abs(condition))
    ms, ps, gs = target / target_scale, sign / sign_scale, condition / condition_scale
    sign_product = product_matrix(ps, sign_multiplier_degrees).tocsr()
    condition_product = product_matrix(gs, condition_multiplier_degrees).tocsr()
    matrix = hstack([sign_product, -condition_product], format="csr")
    row_max = np.maximum(
        np.abs(ms.ravel()),
        np.asarray(np.abs(matrix).max(axis=1).toarray()).ravel(),
    )
    row_max[row_max == 0] = 1.0
    result = linprog(
        np.ones(matrix.shape[1]),
        A_ub=matrix.multiply((1.0 / row_max)[:, None]).tocsr(),
        b_ub=ms.ravel() / row_max,
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
        "identity": "compact symmetric M=R+P*Qp+(-g0)*Qg",
        "coordinate_map": f"r={args.r0}+z/(1-z), s={args.s_max}*x, q=s^2*y/4, c={args.c_max}*w",
        "target_degrees_z_x_y_w": target_degrees,
        "sign_degrees_z_x_y_w": sign_degrees,
        "condition_degrees_z_x_y_w": condition_degrees,
        "invariant_multiplier_degrees_z_x_y_w": sign_multiplier_degrees,
        "condition_multiplier_degrees_z_x_y_w": condition_multiplier_degrees,
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
                "sign_scale": float(sign_scale),
                "condition_scale": float(condition_scale),
            }
        )
    output = args.output or Path(
        f"symmetric_combined_ground_root_{args.parity}_lp_20260806.json"
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
