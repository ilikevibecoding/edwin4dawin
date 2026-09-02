#!/usr/bin/env python3
"""Replay the structural identities in the terminal linear-package note."""

from __future__ import annotations

import sympy as sp


def main() -> int:
    beta, n, r = sp.symbols("beta n r", positive=True)
    k = r + 1
    cutoff_numerator = (beta + 1) * (n + 1)
    cutoff_denominator = beta + n + 3
    room = sp.expand(
        cutoff_numerator - k * cutoff_denominator
    )
    expected_room = sp.expand(
        (beta - r) * (n - r) - (r + 1) * (r + 2)
    )
    assert sp.expand(room - expected_room) == 0

    bm, b, bp, cm, c = sp.symbols(
        "b_m b b_p c_m c", positive=True
    )
    m_r = 1 + cm / b
    m_next = 1 + c / bp
    a = b + cm
    ap = bp + c

    condition_c = sp.expand(a * b - bm * ap)
    condition_c_multiplier = sp.factor(
        b**2 * m_r - bm * bp * m_next
    )
    assert sp.expand(condition_c - condition_c_multiplier) == 0

    condition_d = sp.expand((r + 1) * b * ap - r * a * bp)
    condition_d_multiplier = sp.factor(
        b * bp * ((r + 1) * m_next - r * m_r)
    )
    assert sp.expand(condition_d - condition_d_multiplier) == 0

    u, w, h = sp.symbols("u w h", positive=True)
    m0, m1, m2 = sp.symbols("m0 m1 m2", positive=True)
    q_f = 1 + u - w
    q_t = 1 + w * m1 / m0 - h * m2 / m1
    curvature_floor = sp.expand(2 * (r + 1) * q_t - r * q_f)
    displayed = sp.expand(
        2
        * (r + 1)
        * (1 + w * m1 / m0 - h * m2 / m1)
        - r * (1 + u - w)
    )
    assert sp.simplify(curvature_floor - displayed) == 0

    print("PASS: terminal linear-package structural identities")
    print("cutoff room =", room)
    print("C reserve =", condition_c)
    print("D reserve =", condition_d)
    print("H =", curvature_floor)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
