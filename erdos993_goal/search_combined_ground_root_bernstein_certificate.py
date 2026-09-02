#!/usr/bin/env python3
"""Search the complementary moment/invariant Bernstein certificate.

On the hard chamber we have g0<0 and failure of the continued-fraction
invariant, whose irreducible sign factor P is positive.  Seek

    W*M = R + P*q + (-g0)*Q,

with q>=0 and Bernstein/power-nonnegative R,Q.  Here
W=(1+r)(1+u)(1+v)(1+c)>0 raises the reduced moment numerator to exactly the
degree of P.
"""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import coo_matrix, hstack

from search_conditional_bernstein_multiplier_all_r import (
    mixed_controls,
    product_matrix,
)


def rational(value: str) -> float:
    if any(marker in value.lower() for marker in (".", "e")):
        return float(value)
    numerator, separator, denominator = value.partition("/")
    output = float(int(numerator))
    return output / int(denominator) if separator else output


def multiply_positive_weight(records: list[list[object]], powers: tuple[int, int, int, int]):
    output: dict[tuple[int, int, int, int], float] = {}
    for exponent_raw, coefficient_raw in records:
        exponent = tuple(map(int, exponent_raw))
        coefficient = rational(str(coefficient_raw))
        output[exponent] = output.get(exponent, 0.0) + coefficient
    for axis, power in enumerate(powers):
        for _ in range(power):
            updated = dict(output)
            for exponent, coefficient in output.items():
                shifted = list(exponent)
                shifted[axis] += 1
                shifted_tuple = tuple(shifted)
                updated[shifted_tuple] = updated.get(shifted_tuple, 0.0) + coefficient
            output = updated
    return output


def load_records(records, c_max: float, uv_max: float, r_shift: int = 0):
    output: dict[tuple[int, int, int, int], float] = {}
    for exponent_raw, coefficient_raw in records:
        exponent = tuple(map(int, exponent_raw))
        coefficient = rational(str(coefficient_raw))
        coefficient *= uv_max ** (exponent[1] + exponent[2]) * c_max ** exponent[3]
        for r_power in range(exponent[0] + 1):
            shifted = (r_power, exponent[1], exponent[2], exponent[3])
            output[shifted] = output.get(shifted, 0.0) + coefficient * comb(
                exponent[0], r_power
            ) * r_shift ** (exponent[0] - r_power)
    return output


def dictionary_records(power):
    return [[list(exponent), str(coefficient)] for exponent, coefficient in power.items()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--c-max", type=float, default=2.0)
    parser.add_argument("--uv-max", type=float, default=1.0)
    parser.add_argument("--r-shift", type=int, default=0)
    parser.add_argument("--time-limit", type=float, default=600.0)
    parser.add_argument("--extra-r", type=int, default=0)
    parser.add_argument("--extra-bounded", type=int, default=0)
    parser.add_argument(
        "--weight-mode", choices=("product", "none"), default="product"
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    moment_path = Path(f"{args.parity}_symbolic_reduced_moment_numerator_20260806.json")
    if not moment_path.exists() and args.parity == "odd":
        moment_path = Path("odd_symbolic_reduced_moment_numerator_20260806.json")
    moment = json.loads(moment_path.read_text(encoding="utf-8"))
    invariant = json.loads(
        Path(f"combined_ground_root_invariant_{args.parity}_exact_20260806.json").read_text(
            encoding="utf-8"
        )
    )
    sign_factor = max(
        invariant["numerator_factorization"]["factors"],
        key=lambda item: item["terms"],
    )
    sign_degrees = tuple(sign_factor["degrees_r_u_v_c"])
    if args.weight_mode == "product":
        weight_powers = (
            1 + args.extra_r,
            1 + args.extra_bounded,
            1 + args.extra_bounded,
            1 + args.extra_bounded,
        )
        weighted_target_power = multiply_positive_weight(
            moment["moment_reduced_numerator"], weight_powers
        )
        target_degrees = tuple(
            max(index[axis] for index in weighted_target_power) for axis in range(4)
        )
    else:
        weight_powers = (0, 0, 0, 0)
        weighted_target_power = {
            tuple(map(int, exponent)): rational(str(coefficient))
            for exponent, coefficient in moment["moment_reduced_numerator"]
        }
        target_degrees = tuple(
            sign_degrees[axis]
            + (args.extra_r if axis == 0 else args.extra_bounded)
            for axis in range(4)
        )
    condition_degrees = tuple(moment["condition_degrees"])
    assert all(target_degrees[axis] >= sign_degrees[axis] for axis in range(4))
    multiplier_degrees = tuple(target_degrees[axis] - condition_degrees[axis] for axis in range(4))
    sign_multiplier_degrees = tuple(
        target_degrees[axis] - sign_degrees[axis] for axis in range(4)
    )

    target = mixed_controls(
        load_records(
            dictionary_records(weighted_target_power),
            args.c_max,
            args.uv_max,
            args.r_shift,
        ),
        target_degrees,
    )
    condition = mixed_controls(
        load_records(
            moment["condition_numerator"], args.c_max, args.uv_max, args.r_shift
        ),
        condition_degrees,
    )
    sign = mixed_controls(
        load_records(
            sign_factor["polynomial"], args.c_max, args.uv_max, args.r_shift
        ),
        sign_degrees,
    )
    target_scale = np.max(np.abs(target))
    condition_scale = np.max(np.abs(condition))
    sign_scale = np.max(np.abs(sign))
    ms = target / target_scale
    gs = condition / condition_scale
    ps = sign / sign_scale
    product = product_matrix(gs, multiplier_degrees).tocsr()
    sign_product = product_matrix(ps, sign_multiplier_degrees).tocsr()
    # R = M - P*Qp + g*Qg >= 0, hence P*Qp - g*Qg <= M.
    matrix = hstack(
        [sign_product, -product],
        format="csr",
    )
    row_max = np.maximum(np.abs(ms.ravel()), np.asarray(np.abs(matrix).max(axis=1).toarray()).ravel())
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
    report = {
        "status": "feasible" if result.success else "infeasible_or_unresolved",
        "message": result.message,
        "parity": args.parity,
        "identity": "W*M = R + P*q + (-g0)*Q",
        "positive_weight_powers_r_u_v_c": weight_powers,
        "c_max": args.c_max,
        "uv_max": args.uv_max,
        "r_shift": args.r_shift,
        "target_degrees_r_u_v_c": target_degrees,
        "condition_degrees_r_u_v_c": condition_degrees,
        "invariant_sign_degrees_r_u_v_c": sign_degrees,
        "condition_multiplier_degrees_r_u_v_c": multiplier_degrees,
        "invariant_multiplier_degrees_r_u_v_c": sign_multiplier_degrees,
        "constraint_count": matrix.shape[0],
        "variable_count": matrix.shape[1],
        "nonzero_matrix_entries": matrix.nnz,
    }
    if result.success:
        variables = result.x
        remainder = ms.ravel() - matrix @ variables
        q_shape = tuple(value + 1 for value in multiplier_degrees)
        p_shape = tuple(value + 1 for value in sign_multiplier_degrees)
        p_count = int(np.prod(p_shape))
        report.update(
            {
                "positive_invariant_multiplier_controls": int(
                    np.sum(variables[:p_count] > 1e-12)
                ),
                "invariant_multiplier_controls_scaled": [
                    {
                        "index": [int(value) for value in np.unravel_index(index, p_shape)],
                        "value": float(value),
                    }
                    for index, value in enumerate(variables[:p_count])
                    if value > 1e-12
                ],
                "objective": float(result.fun),
                "minimum_remainder_control": float(np.min(remainder)),
                "minimum_normalized_remainder_control": float(np.min(remainder / row_max)),
                "positive_condition_multiplier_controls": int(np.sum(variables[p_count:] > 1e-12)),
                "condition_multiplier_controls_scaled": [
                    {
                        "index": [int(value) for value in np.unravel_index(index, q_shape)],
                        "value": float(value),
                    }
                    for index, value in enumerate(variables[p_count:])
                    if value > 1e-12
                ],
                "target_scale": float(target_scale),
                "condition_scale": float(condition_scale),
                "invariant_sign_scale": float(sign_scale),
            }
        )
    output = args.output or Path(
        f"combined_ground_root_bernstein_{args.parity}_lp_20260806.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                key: value
                for key, value in report.items()
                if key
                not in (
                    "condition_multiplier_controls_scaled",
                    "invariant_multiplier_controls_scaled",
                )
            },
            indent=2,
        )
    )
    print(output)


if __name__ == "__main__":
    main()
