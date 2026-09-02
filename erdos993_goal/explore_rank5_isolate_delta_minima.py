#!/usr/bin/env python3
"""Numerically locate tight points of the isolate-payment differences.

This is an exploratory companion to the exact Bernstein verifier.  It
optimizes the *unscaled* normalized forward difference over each of the
four endpoint boxes, helping choose effective exact subdivisions.
"""

from __future__ import annotations

import argparse

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution

from verify_rank5_isolate_payment_monotonicity import (
    parameter_data,
    raw_forward_differences,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--difference", type=int, default=5)
    parser.add_argument("--iterations", type=int, default=800)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--core-order", type=int, default=13)
    parser.add_argument(
        "--c0-bound",
        choices=("order", "combined"),
        default="combined",
    )
    args = parser.parse_args()
    assert 1 <= args.difference <= 15

    differences, coefficient_variables = raw_forward_differences()
    (
        box_variables,
        normalized_variables,
        (w, v, z),
        regions,
    ) = parameter_data(args.core_order)
    X, T, A, W, V, Z = box_variables
    D, r, q = normalized_variables
    c0, c1, c2, c3, c4, c5, h, k = coefficient_variables

    raw = differences[args.difference - 1]
    raw_evaluator = sp.lambdify(coefficient_variables, raw, "numpy")
    w_evaluator = sp.lambdify((X, W), w, "numpy")
    v_evaluator = sp.lambdify((X, W, V), v, "numpy")
    z_evaluator = sp.lambdify((X, W, V, Z), z, "numpy")

    bounds = [
        (1e-5, 1),
        (0, 1),
        (0, 1),
        (1e-5, 1),
        (0, 1),
        (0, 1),
    ]
    for region_name, r_value, D_value, q_value in regions:
        r_evaluator = sp.lambdify(box_variables, r_value, "numpy")
        D_evaluator = sp.lambdify(box_variables, D_value, "numpy")
        q_evaluator = sp.lambdify(box_variables, q_value, "numpy")

        def objective(point):
            x_value, _, _, w_box, v_box, z_box = point
            d_value = float(D_evaluator(*point))
            r_numeric = float(r_evaluator(*point))
            q_numeric = float(q_evaluator(*point))
            w_numeric = float(w_evaluator(x_value, w_box))
            v_numeric = float(v_evaluator(x_value, w_box, v_box))
            z_numeric = float(
                z_evaluator(x_value, w_box, v_box, z_box)
            )
            if args.c0_bound == "combined" and w_numeric > 0:
                z_numeric = min(
                    z_numeric,
                    z_box
                    * v_numeric**2
                    / (v_numeric + 2 * w_numeric),
                )
            value = raw_evaluator(
                z_numeric,
                v_numeric,
                w_numeric,
                1.0,
                1.0 / x_value,
                (1.0 - d_value) / x_value**2,
                r_numeric,
                q_numeric / x_value,
            )
            if not np.isfinite(value):
                return 1e300
            return float(value) / w_box

        result = differential_evolution(
            objective,
            bounds,
            seed=args.seed,
            popsize=25,
            maxiter=args.iterations,
            polish=True,
            updating="immediate",
            workers=1,
            tol=1e-10,
        )
        print(
            region_name,
            "minimum",
            result.fun,
            "point",
            tuple(float(item) for item in result.x),
            "success",
            result.success,
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
