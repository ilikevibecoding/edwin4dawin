#!/usr/bin/env python3
"""Derive NCL in the common terminal-mixture moment coordinates."""

from __future__ import annotations

import sympy as sp


def main() -> None:
    r = sp.symbols("r", positive=True, integer=True)
    k = r + 1
    u, pi = sp.symbols("u pi", positive=True)
    w2, z1, w3, z2 = sp.symbols("W2 Z W3 Z2", real=True)
    delta = sp.symbols("delta", nonnegative=True)
    d = u + r * pi
    n = w2 + k * z1
    q = w3 + (k + 1) * z2

    v = n / d
    s = u / d
    theta = r / (d + r)
    zeta = v - k * u / r
    qf = 1 + u - w2 / u
    # Since v*y=Q/D, v*qT=v+v^2-Q/D.
    vqt = v + v**2 - q / d
    h_times_v = 2 * k * vqt - r * v * qf
    ncl = (
        h_times_v
        + k * s * (r + 2) * qf
        - 2 * k * (s * delta + theta * zeta**2)
    )

    numerator, denominator = sp.fraction(sp.factor(ncl))
    print("denominator:")
    print(sp.factor(denominator))
    print("\nnumerator factored:")
    print(sp.factor(numerator))
    print("\ncollected in W3,Z2:")
    print(sp.collect(sp.expand(numerator), (w3, z2)))

    rt = k + n**2 / d**2 - q / d
    rf = r + u**2 - w2
    coupling = (r * n - k * u * (r + 2)) / d
    reserve_form = (
        2 * k * rt
        - coupling * rf / u
        + k
        * (r + 2)
        * (u - r)
        * (1 / r + s / u)
        + zeta * (r + 2 + r**2 / u)
        - 2 * k * (s * delta + theta * zeta**2)
    )
    assert sp.factor(ncl - reserve_form) == 0
    print("\ncommon reserve identity: PASS")


if __name__ == "__main__":
    main()
