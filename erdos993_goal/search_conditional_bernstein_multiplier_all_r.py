#!/usr/bin/env python3
"""Search an all-r conditional Bernstein/power-basis certificate.

The first coordinate r is kept in the nonnegative power basis.  The bounded
coordinates u,v and w=c/c_max use their full tensor Bernstein bases.
"""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import coo_matrix


def load_terms(
    records: list[list[object]], c_max: float, uv_max: float, r_shift: int
) -> dict[tuple[int, int, int, int], float]:
    output = {}
    for exponent_raw, coefficient_raw in records:
        exponent = tuple(map(int, exponent_raw))
        numerator, separator, denominator = str(coefficient_raw).partition("/")
        coefficient = float(int(numerator))
        if separator:
            coefficient /= int(denominator)
        coefficient *= (
            uv_max ** (exponent[1] + exponent[2])
            * c_max ** exponent[3]
        )
        for r_power in range(exponent[0] + 1):
            shifted_exponent = (r_power, exponent[1], exponent[2], exponent[3])
            shifted_coefficient = (
                coefficient
                * comb(exponent[0], r_power)
                * r_shift ** (exponent[0] - r_power)
            )
            output[shifted_exponent] = (
                output.get(shifted_exponent, 0.0) + shifted_coefficient
            )
    return output


def mixed_controls(
    power: dict[tuple[int, int, int, int], float],
    degrees: tuple[int, int, int, int],
) -> np.ndarray:
    # Fill the power tensor, then apply the three independent triangular
    # power-to-Bernstein transforms.  This is algebraically identical to the
    # nested coefficient formula but avoids a quadratic scan over sparse
    # monomials and output controls.
    output = np.zeros(tuple(degree + 1 for degree in degrees), dtype=float)
    for exponent, coefficient in power.items():
        output[exponent] += coefficient
    for axis in (1, 2, 3):
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


def product_matrix(
    condition: np.ndarray,
    multiplier_degrees: tuple[int, int, int, int],
) -> coo_matrix:
    condition_degrees = tuple(value - 1 for value in condition.shape)
    output_degrees = tuple(
        condition_degrees[axis] + multiplier_degrees[axis] for axis in range(4)
    )
    q_shape = tuple(value + 1 for value in multiplier_degrees)
    output_shape = tuple(value + 1 for value in output_degrees)
    rows: list[int] = []
    columns: list[int] = []
    values: list[float] = []
    nonzero_condition = [
        (index, condition[index])
        for index in np.ndindex(condition.shape)
        if condition[index] != 0
    ]
    for condition_index, condition_value in nonzero_condition:
        for multiplier_index in np.ndindex(q_shape):
            output_index = tuple(
                condition_index[axis] + multiplier_index[axis] for axis in range(4)
            )
            factor = condition_value
            for axis in (1, 2, 3):
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--c-max", type=float, default=2.0)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--extra-r", type=int, default=0)
    parser.add_argument("--extra-bounded", type=int, default=0)
    parser.add_argument("--r-shift", type=int, default=0)
    parser.add_argument("--uv-max", type=float, default=1.0)
    args = parser.parse_args()
    raw = json.loads(args.input.read_text(encoding="utf-8"))
    target_degrees = tuple(map(int, raw["numerator_degrees"]))
    condition_degrees = tuple(map(int, raw["condition_degrees"]))
    multiplier_degrees = tuple(
        target_degrees[axis]
        - condition_degrees[axis]
        + (args.extra_r if axis == 0 else args.extra_bounded)
        for axis in range(4)
    )
    output_degrees = tuple(
        condition_degrees[axis] + multiplier_degrees[axis] for axis in range(4)
    )
    target = mixed_controls(
        load_terms(
            raw["moment_reduced_numerator"],
            args.c_max,
            args.uv_max,
            args.r_shift,
        ),
        output_degrees,
    )
    condition = mixed_controls(
        load_terms(
            raw["condition_numerator"],
            args.c_max,
            args.uv_max,
            args.r_shift,
        ),
        condition_degrees,
    )
    target_scale = np.max(np.abs(target))
    condition_scale = np.max(np.abs(condition))
    ms = target / target_scale
    gs = condition / condition_scale
    product = product_matrix(gs, multiplier_degrees).tocsr()
    row_max = np.maximum(
        np.abs(ms.ravel()),
        np.asarray(np.abs(product).max(axis=1).toarray()).ravel(),
    )
    row_max[row_max == 0] = 1.0
    normalized_product = product.multiply((1.0 / row_max)[:, None]).tocsr()
    normalized_target = ms.ravel() / row_max
    result = linprog(
        np.ones(product.shape[1]),
        A_ub=-normalized_product,
        b_ub=normalized_target,
        bounds=(0, None),
        method="highs",
        options={
            "dual_feasibility_tolerance": 1e-9,
            "primal_feasibility_tolerance": 1e-9,
            "time_limit": 600,
        },
    )
    report: dict[str, object] = {
        "status": "feasible" if result.success else "infeasible_or_unresolved",
        "message": result.message,
        "input": str(args.input),
        "parity": raw["parity"],
        "c_max": args.c_max,
        "uv_max": args.uv_max,
        "target_degrees_r_u_v_c": target_degrees,
        "certificate_output_degrees_r_u_v_c": output_degrees,
        "condition_degrees_r_u_v_c": condition_degrees,
        "multiplier_degrees_r_u_v_c": multiplier_degrees,
        "constraint_count": product.shape[0],
        "variable_count": product.shape[1],
        "nonzero_matrix_entries": product.nnz,
        "degree_elevation_r_bounded": [args.extra_r, args.extra_bounded],
        "r_shift": args.r_shift,
    }
    if result.success:
        q = result.x
        remainder = ms.ravel() + product @ q
        normalized_remainder = remainder / row_max
        q_shape = tuple(value + 1 for value in multiplier_degrees)
        report.update(
            {
                "objective": float(result.fun),
                "minimum_multiplier_control": float(np.min(q)),
                "minimum_remainder_control": float(np.min(remainder)),
                "minimum_row_normalized_remainder": float(np.min(normalized_remainder)),
                "positive_multiplier_control_count": int(np.sum(q > 1e-12)),
                "nonzero_multiplier_controls_scaled": [
                    {
                        "index": [
                            int(value)
                            for value in np.unravel_index(index, q_shape)
                        ],
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
            {
                key: value
                for key, value in report.items()
                if key != "nonzero_multiplier_controls_scaled"
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
