#!/usr/bin/env python3
"""Verify the exact assembly identities for the terminal rank-6 theorem.

This is the lightweight top-level verifier.  The three computational
inputs it assembles are certified independently by

    verify_tree_rank345_defect_ceiling.py
    verify_rank6_terminal_isolate_monotonicity.py
    verify_rank6_terminal_small_core_isolates.py

Together with verify_rank6_terminal_base_cone.py, they prove the strong
rank-6 rooted inequality at a diameter endpoint of every tree of order
at least 18.
"""

from __future__ import annotations

import sympy as sp


DEFECT_CEILING = sp.Rational(1559, 3575)


def strong_margin(d, e, h, k):
    return sp.expand(d * (2 * e + d) - 24 * (e * h - d * k))


def verify_terminal_identity() -> None:
    x, y, z, u, v = sp.symbols("x y z u v")

    # Delete a diameter-endpoint leaf p and its support q.  If B is
    # what remains after deleting p,q and C=B-N_B(q), then
    #
    #   x=i3(B), y=i4(B), z=i5(B),
    #   u=i3(C), v=i4(C).
    #
    # The four coefficients in the rooted margin follow from the two
    # deletion recurrences at q and p.
    h = y + u
    k = z + v
    d = h + x
    e = k + y
    reduced = (
        x**2
        + (y + u) ** 2
        + 2 * x * (2 * y + u)
        + (26 * x + 2 * (y + u)) * (z + v)
        - 22 * y * (y + u)
    )
    assert sp.factor(strong_margin(d, e, h, k) - reduced) == 0


def verify_normalization() -> None:
    X, D, r, q, y = sp.symbols(
        "X D r q y", positive=True
    )
    x = X * y
    z = (1 - D) * y / X
    u = r * x
    v = q * y
    reduced = (
        x**2
        + (y + u) ** 2
        + 2 * x * (2 * y + u)
        + (26 * x + 2 * (y + u)) * (z + v)
        - 22 * y * (y + u)
    )
    phi = (
        -2 * D * r
        - 26 * D
        - 2 * D / X
        + X**2 * r**2
        + 2 * X**2 * r
        + X**2
        + 2 * X * q * r
        + 26 * X * q
        - 20 * X * r
        + 4 * X
        + 2 * q
        + 2 * r
        + 5
        + 2 / X
    )
    assert sp.factor(reduced - y**2 * phi) == 0


def verify_order_partition() -> None:
    # A terminal tree has order m+s+2, where m is the tree-core order
    # and s is the number of sibling leaves at the support.
    #
    # Large cores m>=20 are covered by the all-s isolate certificate.
    # For 1<=m<=19, order at least 18 is exactly s>=16-m (or s>=0).
    for m in range(1, 20):
        first_s = max(0, 16 - m)
        assert m + first_s + 2 >= 18
        if first_s:
            assert m + first_s + 1 < 18


def verify_defect_conversion() -> None:
    x, y, z = sp.symbols("x y z", positive=True)
    D = 1 - x * z / y**2
    inequality_gap = 3575 * x * z - 2016 * y**2
    assert sp.factor(
        inequality_gap
        - 3575 * y**2 * (DEFECT_CEILING - D)
    ) == 0


def main() -> int:
    verify_terminal_identity()
    verify_normalization()
    verify_order_partition()
    verify_defect_conversion()
    print("rank-6 terminal leaf theorem assembly: PASS")
    print(f"defect ceiling = {DEFECT_CEILING}")
    print("large-core cutoff = 20; finite rooted cores = 1..19")
    print("tree-order threshold = 18")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
