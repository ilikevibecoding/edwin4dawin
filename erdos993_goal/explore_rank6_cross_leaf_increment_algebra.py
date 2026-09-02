#!/usr/bin/env python3
"""Symbolic leaf-addition increments of the rank-6 rooted cross margin."""

from __future__ import annotations

import sympy as sp


def cross(d, e, f, h, k):
    return d * (e**2 - d * f) - 2 * e * (e * h - d * k)


def main() -> int:
    d, e, f, h, k = sp.symbols("d e f h k", positive=True)

    # The attachment vertex and distinguished root are different.
    u, v, w, y, z = sp.symbols("u v w y z", nonnegative=True)
    different = sp.expand(
        cross(d + u, e + v, f + w, h + y, k + z)
        - cross(d, e, f, h, k)
    )
    print("different =", sp.factor(different))
    print("different collected =", sp.collect(different, (y, z, w)))

    # The new leaf is attached directly to the distinguished root.
    c = sp.symbols("c", nonnegative=True)
    same = sp.expand(
        cross(d + c, e + h, f + k, h + c, k + h)
        - cross(d, e, f, h, k)
    )
    print("same =", sp.factor(same))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
