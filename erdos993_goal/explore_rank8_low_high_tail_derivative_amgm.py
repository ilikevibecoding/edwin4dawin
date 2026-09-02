#!/usr/bin/env python3
"""Diagnostic search for the derivative AM-GM reduction.

For one high-tail gap b_r this computes the exact pairwise split

    dM/db_r = L_r + R_r

and searches the normalized product 4*L_r*R_r/(dT/db_r)^2.  This is
numerical scouting only; it is not a certificate.
"""

from __future__ import annotations

import argparse
import math

import numpy as np
from scipy.optimize import differential_evolution


def ratios(h, terminal, slacks):
    out = [0.0] * 9
    out[8] = terminal
    for i in range(7, -1, -1):
        out[i] = out[i + 1] + h + (h if i == 0 else 0.0) + slacks[i]
    return out


def row(ratios_):
    out = [1.0]
    for i, value in enumerate(ratios_):
        out.append(out[-1] * value / (i + 1))
    return out


def at(row_, i):
    return row_[i] if 0 <= i < len(row_) else 0.0


def kernel(row_, i, k):
    return at(row_, 7 - i) * at(row_, 8 - k) - at(row_, 8 - i) * at(row_, 7 - k)


def objective_for(r):
    def objective(log_values):
        values = np.exp(log_values)
        h = 1.0
        A = ratios(h, values[0], [values[1], 0.0, *values[2:8]])
        B = ratios(h, values[8], list(values[9:17]))
        p, q = row(A), row(B)
        F = [A[i] + i * h for i in range(9)]
        G = [B[i] + i * h for i in range(9)]
        score = [sum(1.0 / B[u] for u in range(min(j, r + 1))) for j in range(10)]

        def derivative_kernel(i, k):
            a, b = 7 - i, 8 - k
            return (
                at(q, a) * at(q, b) * (at(score, a) + at(score, b))
                - at(q, a + 1) * at(q, b - 1) * (at(score, a + 1) + at(score, b - 1))
            )

        target = h * p[1] * p[2] * derivative_kernel(1, 2)
        if target <= 0.0 or not math.isfinite(target):
            return 1.0e100
        left = sum(
            p[i] * p[k] * (F[i] - F[k]) * derivative_kernel(i, k)
            for i in range(9)
            for k in range(i + 1, 9)
        )
        right = sum(
            q[j]
            * q[l]
            * (
                (score[j] + score[l]) * (G[j] - G[l])
                + int(j <= r < l)
            )
            * kernel(p, j, l)
            for j in range(9)
            for l in range(j + 1, 9)
        )
        ratio = 4.0 * left * right / (target * target)
        return ratio if math.isfinite(ratio) else 1.0e100

    return objective


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--right-slack", type=int, choices=range(3, 8), required=True)
    parser.add_argument("--log-bound", type=float, default=12.0)
    args = parser.parse_args()
    result = differential_evolution(
        objective_for(args.right_slack),
        [(-args.log_bound, args.log_bound)] * 17,
        seed=820_993 + args.right_slack,
        popsize=7,
        maxiter=500,
        polish=True,
        workers=1,
        updating="immediate",
        tol=1e-10,
    )
    print("right_slack", args.right_slack)
    print("minimum_4LR_over_T2", result.fun)
    print("log_coordinates", result.x.tolist())


if __name__ == "__main__":
    main()
