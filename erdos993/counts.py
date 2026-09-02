"""Exact counting formulas used to certify completeness of the enumerations.

Everything here is computed from first principles (no table look-ups):

* ``rooted_tree_counts``  -- A000081 via the classical recurrence
  r(n+1) = (1/n) * sum_{k=1..n} ( sum_{d|k} d r(d) ) r(n-k+1).
* ``free_tree_counts``    -- A000055 via Otter's formula
  t(n) = r(n) - (1/2) sum_{i=1..n-1} r(i) r(n-i) + (1/2) r(n/2) [n even].
* ``forest_counts``       -- A005195, the Euler transform of A000055.

An enumeration that produces pairwise distinct canonical forms whose number
equals the formula value is therefore complete.
"""

from __future__ import annotations

from fractions import Fraction
from typing import List


def _divisor_sum_weighted(k: int, r: List[int]) -> int:
    return sum(d * r[d] for d in range(1, k + 1) if k % d == 0)


def rooted_tree_counts(nmax: int) -> List[int]:
    r = [0] * (nmax + 1)
    if nmax >= 1:
        r[1] = 1
    for n in range(1, nmax):
        acc = Fraction(0)
        for k in range(1, n + 1):
            acc += _divisor_sum_weighted(k, r) * r[n - k + 1]
        val = acc / n
        assert val.denominator == 1
        r[n + 1] = int(val)
    return r


def free_tree_counts(nmax: int) -> List[int]:
    r = rooted_tree_counts(nmax)
    t = [0] * (nmax + 1)
    for n in range(1, nmax + 1):
        s = sum(r[i] * r[n - i] for i in range(1, n))
        val = Fraction(r[n]) - Fraction(s, 2)
        if n % 2 == 0:
            val += Fraction(r[n // 2], 2)
        assert val.denominator == 1
        t[n] = int(val)
    return t


def forest_counts(nmax: int) -> List[int]:
    t = free_tree_counts(nmax)
    f = [0] * (nmax + 1)
    f[0] = 1
    for n in range(1, nmax + 1):
        acc = Fraction(0)
        for k in range(1, n + 1):
            acc += _divisor_sum_weighted(k, t) * f[n - k]
        val = acc / n
        assert val.denominator == 1
        f[n] = int(val)
    return f


if __name__ == "__main__":
    import sys

    nmax = int(sys.argv[1]) if len(sys.argv) > 1 else 26
    print("rooted trees (A000081):", rooted_tree_counts(nmax)[1:])
    print("free trees   (A000055):", free_tree_counts(nmax)[1:])
    print("forests      (A005195):", forest_counts(nmax))
