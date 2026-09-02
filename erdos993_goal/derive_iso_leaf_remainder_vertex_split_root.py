#!/usr/bin/env python3
"""Expand the ISO leaf remainder after splitting at its support vertex."""

from __future__ import annotations

import sympy as sp


def main() -> None:
    r = sp.symbols("r", integer=True, positive=True)
    c = {k: sp.symbols(f"c_{k:+d}") for k in range(-4, 3)}
    h = {k: sp.symbols(f"h_{k:+d}") for k in range(-4, 3)}
    a = {k: c[k] + h[k - 1] for k in range(-2, 2)}
    d = sp.expand(
        c[-1] ** 2
        + 2 * r * a[0] * c[-1]
        + 2 * a[-1] * c[-2]
        - (r + 1) * a[-1] * c[0]
        - (r + 1) * c[-2] * a[1]
        - c[-2] * c[0]
    )
    print(sp.collect(d, list(h.values())))
    print("DERIVED_EXACT_ISO_LEAF_REMAINDER_VERTEX_SPLIT")


if __name__ == "__main__":
    main()
