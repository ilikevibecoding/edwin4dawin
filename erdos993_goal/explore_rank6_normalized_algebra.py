#!/usr/bin/env python3
"""Derive and numerically test the normalized rank-6 leaf payment."""

from __future__ import annotations

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution

from verify_general_q_leaf_payment_identity import payment


X, D, r, q = sp.symbols("X D r q", real=True)


def normalized_payment() -> sp.Expr:
    scale = sp.symbols("scale", positive=True)
    d = X * scale
    e = scale
    f = (1 - D) * scale / X
    h = r * d
    k = q * e
    expression = payment(6, e + h, f + k, d, e, f)
    normalized = sp.cancel(expression / (6 * scale**4))
    assert sp.denom(normalized) == 1
    return sp.expand(normalized)


PHI = normalized_payment()


def main() -> int:
    print("PHI6 =", PHI)
    print(
        "second derivatives:",
        "q",
        sp.factor(sp.diff(PHI, q, 2)),
        "D",
        sp.factor(sp.diff(PHI, D, 2)),
    )
    function = sp.lambdify((X, D, r, q), PHI, "numpy")

    def objective(raw):
        x, d_unit, r_unit, q_unit = raw
        d0 = (2 + x) / 12
        d_value = d0 + (1 - d0) * d_unit
        r_value = 0.5 + 0.5 * r_unit
        q0 = max(0.5, r_value - d_value / 2)
        q_value = q0 + (1 - q0) * q_unit
        return float(function(x, d_value, r_value, q_value))

    result = differential_evolution(
        objective,
        [(1e-8, 1), (0, 1), (0, 1), (0, 1)],
        seed=996,
        popsize=40,
        maxiter=1500,
        tol=1e-12,
        polish=True,
    )
    x, d_unit, r_unit, q_unit = result.x
    d0 = (2 + x) / 12
    d_value = d0 + (1 - d0) * d_unit
    r_value = 0.5 + 0.5 * r_unit
    q0 = max(0.5, r_value - d_value / 2)
    q_value = q0 + (1 - q0) * q_unit
    print(
        f"minimum={result.fun} "
        f"point={(x, d_value, r_value, q_value)} "
        f"success={result.success}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
