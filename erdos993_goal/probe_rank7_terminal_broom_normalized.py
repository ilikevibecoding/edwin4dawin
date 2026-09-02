#!/usr/bin/env python3
"""Normalize low terminal-broom Newton coefficients and probe signs."""

from __future__ import annotations

import sympy as sp

from verify_rank7_terminal_broom_high_differences import (
    a,
    b,
    c,
    n,
    specialized_coefficients,
)


def main() -> int:
    coeffs = specialized_coefficients()
    z, r, s, d, scale = sp.symbols("z r s d scale", positive=True)
    subs0 = {
        c[5]: z * scale,
        c[6]: scale,
        c[7]: scale / r,
        a: (1 - s) * z * scale,
        b: (1 - d) * scale,
    }
    p0 = sp.factor(coeffs[0].subs(subs0, simultaneous=True) / scale**4)
    print("Delta0 normalized =")
    print(p0)
    print("factor numerator =")
    print(sp.factor(sp.together(p0 * r**2)))

    # Successive ratios x_j=c_j/c_(j+1) for j=3,...,6.
    x, y = sp.symbols("x y", positive=True)
    subs = {
        c[3]: x * y * z * scale,
        c[4]: y * z * scale,
        c[5]: z * scale,
        c[6]: scale,
        c[7]: scale / r,
        a: (1 - s) * z * scale,
        b: (1 - d) * scale,
    }
    for rank in range(7):
        p = sp.factor(coeffs[rank].subs(subs, simultaneous=True) / scale**4)
        print(f"\nDelta{rank} ratio numerator:")
        print(sp.factor(sp.together(p * r**2)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
