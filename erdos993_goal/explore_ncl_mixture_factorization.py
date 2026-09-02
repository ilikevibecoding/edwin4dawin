#!/usr/bin/env python3
"""Explore algebraic structure of the negative-cross NCL coefficient margin."""

from __future__ import annotations

import sympy as sp


def main() -> None:
    r = sp.symbols("r", positive=True, integer=True)
    k = r + 1
    bm, b, bp, bpp = sp.symbols("bm b bp bpp", positive=True)
    cm, c, cp = sp.symbols("cm c cp", nonnegative=True)

    a = b + cm
    ap = bp + c
    app = bpp + cp
    gf = bm * b + r * b**2 - k * bm * bp
    gt = a * ap + k * ap**2 - (k + 1) * a * app
    upper = bm * ap - a * b
    margin_no_l = (
        (a + bm)
        * (
            2 * k * bm**2 * b * gt
            - r * a * ap * bm * gf
            + a * bm * b * (r + 2) * gf
        )
        - 2 * k**2 * bm * b * upper**2
    )
    reduced = sp.factor(margin_no_l / bm)

    print("common-factor reduction:")
    print(reduced)
    print("\nlinear coefficient in app=bpp+cp:")
    print(sp.factor(sp.diff(reduced, bpp)))
    assert sp.factor(sp.diff(reduced, bpp) - sp.diff(reduced, cp)) == 0
    print("\nconstant after app=0:")
    print(sp.factor(reduced.subs({bpp: 0, cp: 0})))


if __name__ == "__main__":
    main()
