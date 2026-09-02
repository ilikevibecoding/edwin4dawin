#!/usr/bin/env python3
"""Numerical reconnaissance for the two terminal-bundle boundary terms."""

from __future__ import annotations

import argparse
import math

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution

from verify_rank6_terminal_bundle_boundary_reduction import (
    D,
    X,
    Y,
    Z,
    normalized_boundaries,
    q,
    r,
    u,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-order", type=int, default=40)
    parser.add_argument("--zero-y", action="store_true")
    parser.add_argument("--forest-only", action="store_true")
    parser.add_argument("--half-u", action="store_true")
    args = parser.parse_args()
    residual, first = normalized_boundaries()
    rooted = {r: 1 - u, q: 1 - X * u * Y}
    residual = sp.lambdify(
        (X, D, u, Y), residual.subs(rooted), "numpy"
    )
    first = sp.lambdify(
        (X, D, u, Y, Z), first.subs(rooted), "numpy"
    )

    global_minima = [None, None]
    for order in range(22, args.maximum_order + 1):
        order_minima = [None, None]
        p4 = math.comb(order - 3, 4)
        x_bounds = (
            5 / (order - 5),
            5 * (order - 3) / ((order - 7) * (order - 8)),
        )
        z_bounds = (
            4 / (order - 4),
            4 * (order - 2) / ((order - 5) * (order - 6)),
        )
        for size in range(3, order - 1):
            umax = min(0.5, math.comb(size, 3) / p4)
            if args.half_u:
                umax = 0.5
            umin = (
                math.comb(size - 2, 3) / math.comb(order - 1, 4)
                if size >= 5
                else 0.0
            )
            if umax < umin:
                continue
            yf = max(
                0.0,
                (size * size - 10 * size + 15)
                / (4 * (size - 1)),
            )

            def lower_y(value):
                if args.zero_y:
                    return 0.0
                if args.forest_only:
                    return yf
                ye = 0.75 * (
                    value * p4 / math.comb(size, 2) - 1
                )
                return max(yf, ye)

            for d_endpoint in ("lower", "upper"):
                for index, function in enumerate((residual, first)):
                        def objective(point):
                            x_value, defect4, u_value = point
                            z_value = x_value * (1 - defect4)
                            defect4_lower = (
                                (2 + x_value) / (10 + x_value)
                            )
                            defect4_upper = (
                                (1 + 3 * x_value)
                                / (3 * (2 + x_value))
                            )
                            if (
                                defect4 < defect4_lower
                                or defect4 > defect4_upper
                            ):
                                return 1000 + (
                                    max(defect4_lower - defect4, 0)
                                    + max(defect4 - defect4_upper, 0)
                                )
                            d_value = (
                                (2 + x_value) / 12
                                if d_endpoint == "lower"
                                else 1 / 6 + x_value / 2
                            )
                            y_value = lower_y(u_value)
                            if index == 0:
                                return float(
                                    function(
                                        x_value,
                                        d_value,
                                        u_value,
                                        y_value,
                                    )
                                )
                            return float(
                                function(
                                    x_value,
                                    d_value,
                                    u_value,
                                    y_value,
                                    z_value,
                                )
                            )

                        result = differential_evolution(
                            objective,
                            (
                                x_bounds,
                                (0.2, 0.5),
                                (umin, umax),
                            ),
                            polish=True,
                            seed=20260728,
                            tol=1e-10,
                            popsize=6,
                            maxiter=80,
                        )
                        item = (
                            result.fun,
                            order,
                            size,
                            d_endpoint,
                            result.x[0] * (1 - result.x[1]),
                            result.x[0],
                            result.x[2],
                            lower_y(result.x[2]),
                            result.x[1],
                        )
                        if (
                            order_minima[index] is None
                            or item < order_minima[index]
                        ):
                            order_minima[index] = item
                        if (
                            global_minima[index] is None
                            or item < global_minima[index]
                        ):
                            global_minima[index] = item
        if order <= 30 or order % 10 == 0:
            print(order, order_minima, flush=True)
    print("global", global_minima)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
