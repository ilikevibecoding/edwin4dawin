#!/usr/bin/env python3
"""Exact finite audit of the pure-cubic B2=5 parameter compression."""
from __future__ import annotations

from math import comb
import sympy as sp


def balanced_values(total: int, count: int) -> list[int]:
    quotient, remainder = divmod(total, count)
    return [quotient + 1] * remainder + [quotient] * (count - remainder)


def main() -> int:
    # Every pair in the enlarged skeleton rectangle maps onto, and only onto,
    # the twelve discrete curvature values used by the exact sweep.
    differences = {p - q for p in range(5) for q in range(8)}
    assert differences == set(range(-7, 5))

    profile_count = 0
    for r in (1, 2, 3):
        for t in range(1, 2 * r + 1):
            xs = balanced_values(t, r)
            assert len(xs) == r
            assert sum(xs) == t
            assert all(x in (0, 1, 2) for x in xs)
            # The balanced vector gives the weakest local B2 exclusion and is
            # therefore a safe enlargement of every actual neighbor profile.
            assert comb(r - 1, 2) + sum(comb(x, 2) for x in xs) <= 5
            profile_count += 1
    assert profile_count == 12

    # t=0 is impossible: J is a forest on m>0 vertices, so e(J)<=m-1.
    # The incidence interval also keeps a strictly positive for every swept
    # order/profile, justifying removal of the dominated zero lower endpoint.
    for n in range(23, 39):
        for r in (1, 2, 3):
            m = n - r - 1
            for t in range(1, 2 * r + 1):
                edge_e = m - t
                assert 0 <= edge_e <= m - 1
                e4_hi = min(comb(m, 4), edge_e * comb(m - 2, 2))
                assert comb(m, 4) - e4_hi > 0

    # Exact discrete convexity for the one-neighbor term: balancing (2,0) to
    # (1,1) can only decrease the retained lower bound.
    m = sp.symbols("m", integer=True, positive=True)
    def choose4(z):
        return z * (z - 1) * (z - 2) * (z - 3) / 24
    lhs = sp.expand(choose4(m - 3) - 2 * choose4(m - 4) + choose4(m - 5))
    rhs = sp.expand((m - 5) * (m - 6) / 2)
    assert sp.expand(lhs - rhs) == 0
    for integer_m in range(19, 37):
        assert rhs.subs(m, integer_m) >= 0

    print("PASS exact k compression, 12 rooted profiles, a>0, and balanced convexity")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
