#!/usr/bin/env python3
"""Numerically optimize the direct isolate increment over one box."""

from __future__ import annotations

import argparse
import math

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution

from verify_rank5_isolate_payment_monotonicity import (
    parameter_data,
    raw_forward_differences,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", default="q_upper")
    parser.add_argument(
        "--coefficient-region",
        choices=(
            "pair_low_x",
            "pair_low_ratio",
            "order_high_ratio",
            "new_min",
            "new_harmonic",
        ),
        default="new_min",
    )
    parser.add_argument("--iterations", type=int, default=1000)
    args = parser.parse_args()
    differences, coefficient_variables = raw_forward_differences()
    evaluators = [
        sp.lambdify(coefficient_variables, difference, "numpy")
        for difference in differences
    ]
    box_variables, normalized_variables, _, q_regions = parameter_data(13)
    X, T, A, W, V, Z = box_variables
    D, r, q = normalized_variables
    q_data = [item for item in q_regions if item[0] == args.region]
    assert len(q_data) == 1
    _, r_expression, d_expression, q_expression = q_data[0]
    r_evaluator = sp.lambdify(box_variables, r_expression, "numpy")
    d_evaluator = sp.lambdify(box_variables, d_expression, "numpy")
    q_evaluator = sp.lambdify(box_variables, q_expression, "numpy")

    x0 = 4 / 11

    def objective(point):
        xb, t_box, a_box, w_box, v_box, z_box, S = point
        if args.coefficient_region in {"new_min", "new_harmonic"}:
            x = xb
            vv = v_box
            c0_bound = args.coefficient_region
        elif args.coefficient_region == "pair_low_x":
            x = x0 * xb
            vv = v_box
            c0_bound = "pair"
        else:
            x = x0 + (1 - x0) * xb
            critical = (x + 4) / (12 * x)
            if args.coefficient_region == "pair_low_ratio":
                vv = critical * v_box
                c0_bound = "pair"
            else:
                vv = critical + (1 - critical) * v_box
                c0_bound = "order"
        normalized_point = (x, t_box, a_box, w_box, vv, z_box)
        d_value = float(d_evaluator(*normalized_point))
        r_value = float(r_evaluator(*normalized_point))
        q_value = float(q_evaluator(*normalized_point))
        w = 6 * x * w_box / (x + 8)
        if args.coefficient_region in {"new_min", "new_harmonic"}:
            v = 2 * w * w * vv / 3
        else:
            ratio = 2 * x * vv / (x + 4)
            v = w * ratio
        if c0_bound == "pair":
            z = v * v / (v + 2 * w) * z_box
        elif c0_bound == "order":
            z = v / 13 * z_box
        elif c0_bound == "new_min":
            z = min(v / 13, v * v / (v + 2 * w)) * z_box
        else:
            z = v * v / (w + 7 * v) * z_box
        values = (
            z,
            v,
            w,
            1.0,
            1 / x,
            (1 - d_value) / x**2,
            r_value,
            q_value / x,
        )
        compact = 0.0
        product = 1.0
        for degree, evaluator in enumerate(evaluators):
            if degree:
                product *= S - (degree - 1) * (1 - S)
            basis = (
                (1 - S) ** (14 - degree)
                * product
                / math.factorial(degree)
            )
            compact += float(evaluator(*values)) * basis
        scale = max(x**6 * w_box, 1e-300)
        return compact / scale

    bounds = [
        (1e-4, 1),
        (0, 1),
        (0, 1),
        (1e-4, 1),
        (1e-4, 1),
        (1e-4, 1),
        (0, 1 - 1e-7),
    ]
    result = differential_evolution(
        objective,
        bounds,
        seed=993,
        popsize=35,
        maxiter=args.iterations,
        polish=True,
        tol=1e-11,
        updating="immediate",
        workers=1,
    )
    print(
        f"minimum={result.fun} point={tuple(result.x)} "
        f"success={result.success}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
