#!/usr/bin/env python3
"""Deterministic screen for the two lower-d Delta0 capacity faces.

This is exploratory evidence, not a certificate.  Unlike the earlier
complementary-capacity box, it retains the simultaneous lower bound on i5(J)
and the resulting c5 >= i4(J)+i5(J) feasibility condition.
"""

from __future__ import annotations

import argparse
from math import comb

import numpy as np
import sympy as sp

from prove_rank7_terminal_broom_delta0_large import normalized_low


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-first", type=int, default=25)
    parser.add_argument("--n-last", type=int, default=38)
    parser.add_argument("--envelope-power", type=int, default=0)
    parser.add_argument("--ignore-active-face", action="store_true")
    parser.add_argument("--raw-capacity-face", action="store_true")
    args = parser.parse_args()
    expression, (x, y, z, q, s, d) = normalized_low(0)
    evaluate = sp.lambdify((z, q, s, d), expression.subs({x: 1, y: 1}), "numpy")
    grid = np.linspace(0.0, 1.0, 21)
    minimum = float("inf")
    witness = None
    checked = 0

    order_minima = {}
    for n in range(args.n_first, args.n_last + 1):
        order_minimum = float("inf")
        path_floor = comb(n - 4, 5)
        coefficient_ceiling = comb(n, 5)
        tn = (n - 7) * (n - 8) / (n - 3)
        mu6_lower = (tn - 3 + 2 / tn) / 6
        z_low = 6 / (n - 6)
        z_high = 1 / mu6_lower
        for root_degree in range(1, n - 18):
            m = n - root_degree - 1
            c4j = comb(m, 4)
            c5j = comb(m, 5)
            rho = (m - 7) * (m - 8) / (5 * (m - 3))
            bad_slope = (m - 4) / 3
            a0 = (c5j - bad_slope * c4j) / (rho - bad_slope)
            for region in ("ratio", "badset"):
                for av in grid:
                    a = a0 * av if region == "ratio" else a0 + (c4j - a0) * av
                    b_lower = rho * a if region == "ratio" else c5j - bad_slope * (c4j - a)
                    containment_floor = a + b_lower
                    if args.envelope_power:
                        power = args.envelope_power
                        c5_lower = (path_floor**power + containment_floor**power) / (
                            path_floor ** (power - 1) + containment_floor ** (power - 1)
                        )
                    else:
                        c5_lower = max(path_floor, containment_floor)
                    switch_c5 = a * (m + 1) / 5
                    for face in ("containment", "extension"):
                        if args.ignore_active_face:
                            lower = c5_lower
                            upper = coefficient_ceiling
                        elif face == "containment":
                            lower = c5_lower
                            upper = min(coefficient_ceiling, switch_c5)
                        else:
                            lower = max(c5_lower, switch_c5)
                            upper = coefficient_ceiling
                        if lower > upper or upper <= 0:
                            continue
                        for cv in grid:
                            c5 = lower + (upper - lower) * cv
                            sv = 1 - a / c5
                            if not (0 <= sv <= 1):
                                continue
                            for zv0 in grid:
                                zv = z_low + (z_high - z_low) * zv0
                                # Literal coefficient ceiling c6<=C(n,6).
                                if c5 / zv > comb(n, 6):
                                    continue
                                dv = 1 - sv * zv if face == "containment" else 1 - zv * (m - 4) * (1 - sv) / 5
                                if not args.raw_capacity_face:
                                    dv = max(0.5, dv)
                                if not (dv <= 1):
                                    continue
                                for q_endpoint in (0, 1):
                                    qv = (2 + zv) / 14 if q_endpoint == 0 else 1 / 7 + zv / 2
                                    value = float(evaluate(zv, qv, sv, dv))
                                    checked += 1
                                    order_minimum = min(order_minimum, value)
                                    if value < minimum:
                                        minimum = value
                                        witness = (n, root_degree, m, region, face, av, cv, zv0, q_endpoint, a, b_lower, c5, zv, sv, dv)
        order_minima[n] = order_minimum

    print("checked", checked)
    print("order_minima", order_minima)
    print("minimum", minimum)
    print("witness", witness)
    print("status", "SCREEN_POSITIVE" if minimum >= 0 else "SCREEN_NEGATIVE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
