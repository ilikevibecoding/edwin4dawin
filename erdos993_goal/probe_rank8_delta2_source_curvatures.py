#!/usr/bin/env python3
"""Source-coordinate builder for the reduced rank-eight Delta2 branches."""

from __future__ import annotations

import sympy as sp

from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def build(k_value: int, piece: str):
    n, w, x = sp.symbols("n w x", positive=True)
    U, V, Z = sp.symbols("U V Z", nonnegative=True)
    c0 = 2 * w / ((n - 1) * (n - 2))
    c1 = n * c0
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    d4_low = (2 + x) / 10
    d4 = sp.factor(d4_low + (D4_CEILING - d4_low) * U)
    c5 = sp.factor((1 - d4) / x**2)
    x5 = sp.factor(c4 / c5)
    a = n - 7
    q_low = sp.factor((30 / x5 - 18 - 3 * k_value) / (7 * a))
    q = sp.factor(q_low + 15 * V / (7 * a))
    c6 = sp.factor(c5 * (7 * a * q + 3 * k_value) / 36)
    c7 = sp.factor(a * q * c6 / 6)
    c8 = sp.factor(c7 * (14 * c7 - c6) / (16 * c6))
    if piece == "lcross":
        S = 1 - q + q * Z
        h7 = c7 * Z
    elif piece == "ucap":
        S = 7 * q * Z / 6
        h7 = a * S * c6 / 7
    else:
        raise ValueError(piece)
    h6 = sp.factor(S * c6)
    raw = newton_coefficients(residual())[2]
    value = sp.cancel(
        raw.subs(
            dict(
                zip(
                    (*c[:9], h[6], h[7]),
                    (c0, c1, c2, c3, c4, c5, c6, c7, c8, h6, h7),
                )
            ),
            simultaneous=True,
        )
    )
    return value, (n, w, x, U, V, Z)
