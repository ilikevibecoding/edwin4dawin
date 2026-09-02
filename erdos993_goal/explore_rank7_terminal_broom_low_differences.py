#!/usr/bin/env python3
"""Explore exact structure of Delta^0 through Delta^6 in the rank-7 broom residual."""

from __future__ import annotations

import sympy as sp

from verify_rank7_terminal_broom_high_differences import (
    a,
    b,
    c,
    specialized_coefficients,
)


def main() -> int:
    coeffs = specialized_coefficients()
    variables = (a, b, *c[3:8])
    u, v = sp.symbols("u v", nonnegative=True)
    for rank in range(7):
        value = sp.factor(coeffs[rank])
        print(f"\n=== Delta^{rank} ===")
        print("factor:", value)
        poly = sp.Poly(sp.expand(value), *variables)
        print("terms:", len(poly.terms()), "total_degree:", poly.total_degree())
        print("degrees:", dict(zip([str(v) for v in variables], [poly.degree(v) for v in variables])))
        uv = sp.factor(value.subs({a: c[5] - u, b: c[6] - v}, simultaneous=True))
        print("h5h6 factor:", uv)
        for variable in variables:
            derivative = sp.factor(sp.diff(value, variable))
            print(f"d/d{variable}:", derivative)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
