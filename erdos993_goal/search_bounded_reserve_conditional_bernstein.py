#!/usr/bin/env python3
"""Conditional Bernstein certificate after compactifying r>=r0.

Set r=r0+z/(1-z), multiply a polynomial of r-degree D by (1-z)^D,
and use a full tensor Bernstein basis in z,u,v,c/c_max.  This is much less
restrictive than requiring nonnegative coefficients in the unbounded power
basis for r-r0.
"""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import coo_matrix


def rational(value: str) -> float:
    numerator, separator, denominator = value.partition("/")
    result = float(int(numerator))
    return result / int(denominator) if separator else result


def compactified_power(records, degrees, r0, c_max, uv_max):
    output = np.zeros(tuple(degree + 1 for degree in degrees), dtype=float)
    reserve_degree = degrees[0]
    for exponent_raw, coefficient_raw in records:
        i, j, k, ell = map(int, exponent_raw)
        coefficient = rational(str(coefficient_raw))
        coefficient *= uv_max ** (j + k) * c_max**ell
        # [r0+(1-r0)z]^i * (1-z)^(D-i).
        for a in range(i + 1):
            first = comb(i, a) * r0 ** (i - a) * (1 - r0) ** a
            for b in range(reserve_degree - i + 1):
                z_power = a + b
                output[z_power, j, k, ell] += (
                    coefficient
                    * first
                    * comb(reserve_degree - i, b)
                    * (-1) ** b
                )
    return output


def bernstein_controls(power: np.ndarray, degrees):
    output = power
    for axis in range(4):
        degree = degrees[axis]
        transform = np.zeros((degree + 1, degree + 1), dtype=float)
        for index in range(degree + 1):
            for exponent in range(index + 1):
                transform[index, exponent] = comb(index, exponent) / comb(
                    degree, exponent
                )
        output = np.moveaxis(
            np.tensordot(transform, output, axes=(1, axis)), 0, axis
        )
    return output


def product_matrix(condition: np.ndarray, multiplier_degrees):
    condition_degrees = tuple(size - 1 for size in condition.shape)
    output_degrees = tuple(
        condition_degrees[axis] + multiplier_degrees[axis] for axis in range(4)
    )
    q_shape = tuple(value + 1 for value in multiplier_degrees)
    output_shape = tuple(value + 1 for value in output_degrees)
    rows, columns, values = [], [], []
    nonzero = [
        (index, condition[index])
        for index in np.ndindex(condition.shape)
        if condition[index] != 0.0
    ]
    for condition_index, condition_value in nonzero:
        for multiplier_index in np.ndindex(q_shape):
            output_index = tuple(
                condition_index[axis] + multiplier_index[axis] for axis in range(4)
            )
            factor = condition_value
            for axis in range(4):
                factor *= (
                    comb(condition_degrees[axis], condition_index[axis])
                    * comb(multiplier_degrees[axis], multiplier_index[axis])
                    / comb(output_degrees[axis], output_index[axis])
                )
            rows.append(np.ravel_multi_index(output_index, output_shape))
            columns.append(np.ravel_multi_index(multiplier_index, q_shape))
            values.append(factor)
    return coo_matrix(
        (values, (rows, columns)),
        shape=(int(np.prod(output_shape)), int(np.prod(q_shape))),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--r0", type=int, default=8)
    parser.add_argument("--c-max", type=float, default=2.0)
    parser.add_argument("--uv-max", type=float, default=1.0)
    parser.add_argument("--extra", type=int, default=0)
    parser.add_argument("--time-limit", type=float, default=600.0)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    raw = json.loads(args.input.read_text(encoding="utf-8"))
    target_degrees = tuple(int(value) + args.extra for value in raw["numerator_degrees"])
    condition_degrees = tuple(int(value) for value in raw["condition_degrees"])
    multiplier_degrees = tuple(
        target_degrees[axis] - condition_degrees[axis] for axis in range(4)
    )
    target_power = compactified_power(
        raw["moment_reduced_numerator"],
        target_degrees,
        args.r0,
        args.c_max,
        args.uv_max,
    )
    condition_power = compactified_power(
        raw["condition_numerator"],
        condition_degrees,
        args.r0,
        args.c_max,
        args.uv_max,
    )
    target = bernstein_controls(target_power, target_degrees)
    condition = bernstein_controls(condition_power, condition_degrees)
    target_scale = np.max(np.abs(target))
    condition_scale = np.max(np.abs(condition))
    ms, gs = target / target_scale, condition / condition_scale
    product = product_matrix(gs, multiplier_degrees).tocsr()
    row_max = np.maximum(
        np.abs(ms.ravel()),
        np.asarray(np.abs(product).max(axis=1).toarray()).ravel(),
    )
    row_max[row_max == 0.0] = 1.0
    normalized_product = product.multiply((1.0 / row_max)[:, None]).tocsr()
    normalized_target = ms.ravel() / row_max
    # target = remainder + (-condition)*Q, so remainder=target+condition*Q.
    result = linprog(
        np.ones(product.shape[1]),
        A_ub=-normalized_product,
        b_ub=normalized_target,
        bounds=(0, None),
        method="highs",
        options={
            "dual_feasibility_tolerance": 1e-9,
            "primal_feasibility_tolerance": 1e-9,
            "time_limit": args.time_limit,
        },
    )
    report = {
        "status": "feasible" if result.success else "infeasible_or_unresolved",
        "message": result.message,
        "input": str(args.input),
        "parity": raw["parity"],
        "compactification": f"r={args.r0}+z/(1-z)",
        "c_max": args.c_max,
        "uv_max": args.uv_max,
        "target_degrees_z_u_v_c": target_degrees,
        "condition_degrees_z_u_v_c": condition_degrees,
        "multiplier_degrees_z_u_v_c": multiplier_degrees,
        "constraint_count": product.shape[0],
        "variable_count": product.shape[1],
        "nonzero_matrix_entries": product.nnz,
    }
    if result.success:
        q = result.x
        remainder = ms.ravel() + product @ q
        q_shape = tuple(value + 1 for value in multiplier_degrees)
        report.update(
            {
                "objective": float(result.fun),
                "minimum_multiplier_control": float(np.min(q)),
                "minimum_remainder_control": float(np.min(remainder)),
                "minimum_normalized_remainder_control": float(np.min(remainder / row_max)),
                "positive_multiplier_controls": int(np.sum(q > 1e-12)),
                "multiplier_controls_scaled": [
                    {
                        "index": [int(value) for value in np.unravel_index(index, q_shape)],
                        "value": float(value),
                    }
                    for index, value in enumerate(q)
                    if value > 1e-12
                ],
                "target_scale": float(target_scale),
                "condition_scale": float(condition_scale),
            }
        )
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {key: value for key, value in report.items() if key != "multiplier_controls_scaled"},
            indent=2,
        )
    )
    print(args.output)


if __name__ == "__main__":
    main()
