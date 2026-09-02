#!/usr/bin/env python3
"""Numerical stress test for the refined large-m Delta^2 endpoint."""

from __future__ import annotations

import argparse
import math

import sympy as sp
from scipy.optimize import differential_evolution

from verify_rank6_terminal_bundle_delta2_refined_upper import (
    general_abstract_numerator,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-order", type=int, default=50)
    parser.add_argument("--constant-y", action="store_true")
    args = parser.parse_args()
    polynomial, variables = general_abstract_numerator()
    function = sp.lambdify(variables, polynomial, "numpy")

    global_minimum = None
    for order in range(18, args.maximum_order + 1):
        def objective(point):
            wb, ab, ub, vb = point
            t = 18 / order
            w_num = t * (18 - 4 * t + 3 * t * wb)
            w_den = 2 * (6 - t) * (9 - 2 * t)
            w_value = w_num / w_den
            x_lower = 8 * w_value / (6 - w_value)
            x_upper = 4 * w_value / (3 * (1 - w_value))
            x_value = x_lower + ab * (x_upper - x_lower)
            size = 9 + vb * (order - 11)
            u_cap = (
                math.prod(size - j for j in range(3)) / 6
            ) / math.comb(order - 3, 4)
            u_value = ub * u_cap
            y_value = (
                size * size - 10 * size + 15
            ) / (4 * (size - 1))
            if args.constant_y:
                y_value = 3 / 16
            x5 = 10 * x_value / (8 - x_value)
            r_value = 1 - u_value
            q_value = 1 - x5 * u_value * y_value
            return float(
                function(
                    order,
                    w_value,
                    x_value,
                    r_value,
                    q_value,
                )
            )

        result = differential_evolution(
            objective,
            ((0, 1), (0, 1), (0, 1), (0, 1)),
            seed=20260728,
            popsize=8,
            maxiter=120,
            tol=1e-10,
            polish=True,
        )
        item = (result.fun, order, *result.x)
        if global_minimum is None or item < global_minimum:
            global_minimum = item
        print(item, flush=True)
    print("global", global_minimum)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
