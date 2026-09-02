#!/usr/bin/env python3
"""Numerically test a normalized cone for rank-6 cross superadditivity."""

from __future__ import annotations

import numpy as np
from scipy.optimize import differential_evolution


def cross(d, e, f, h, k):
    return d * (e * e - d * f) - 2 * e * (e * h - d * k)


def main() -> int:
    def decode(raw):
        (
            log_x,
            s_unit,
            c_unit,
            d1_unit,
            d2_unit,
            r_unit,
            q_unit,
            R_unit,
            S_unit,
        ) = raw
        x = np.exp(log_x)
        c_upper = 1.25 + (2 / 3) / x
        c = 1 + (c_upper - 1) * c_unit
        r_min = max(1 / 2, 1 - (4 / 5) / x)
        r = r_min + (1 - r_min) * r_unit
        d1_min = (2 + 1 / x) / 12
        d2_min = (2 + 1 / (c * x)) / 10
        D1 = d1_min + (1 - d1_min) * d1_unit
        D2 = d2_min + (1 - d2_min) * d2_unit
        s = s_unit * min(
            1.0,
            1.0 / (c * x),
            1.0 / (c * c * x * (1 - D2)),
        )
        q_min = max(1 / 3, r - D1 / 2, 1 - 1.5 * (1 - r))
        q = q_min + (1 - q_min) * q_unit
        R_min = max(
            1 / 2,
            r - s / 4,
            1 - (3 / 4) / (c * x),
        )
        R_max = min(1.0, r + s / 4)
        R = R_min + (R_max - R_min) * R_unit
        S_min = max(
            1 / 2,
            R - D2 / 2,
            1 - (5 / 3) * (1 - R),
        )
        S = S_min + (1 - S_min) * S_unit
        return x, s, c, D1, D2, r, q, R, S

    def objective(raw):
        x, s, c, D1, D2, r, q, R, S = decode(raw)
        if D1 > 1 or D2 > 1:
            return 1e6

        A = (
            1.0,
            x,
            x * x * (1 - D1),
            r,
            x * q,
        )
        U = (
            s,
            s * c * x,
            s * c * c * x * x * (1 - D2),
            s * R,
            s * c * x * S,
        )
        total = tuple(A[index] + U[index] for index in range(5))
        return cross(*total) - cross(*A)

    result = differential_evolution(
        objective,
        [
            (np.log(0.6), np.log(100)),
            (1e-6, 1),
            (0, 1),
            (0, 1),
            (0, 1),
            (0.5, 1),
            (0, 1),
            (0.5, 1),
            (0, 1),
        ],
        seed=997,
        popsize=50,
        maxiter=1800,
        tol=1e-12,
        polish=True,
    )
    print(
        f"minimum={result.fun} raw={tuple(result.x)} "
        f"decoded={decode(result.x)} "
        f"success={result.success}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
