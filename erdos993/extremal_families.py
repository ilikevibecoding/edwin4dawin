"""Exact ISO ratios along the families that are extremal in the exhaustive data.

Families (n = number of vertices):
  star(m)            K_{1,m}:                       I = (1+x)^m + x
  star_iso(m, k)     K_{1,m} + k isolated vertices: I = ((1+x)^m + x)(1+x)^k
  double_broom(a, b) middle vertex c adjacent to the centres of K_{1,a} and K_{1,b}:
                     I = ((1+x)^a + x)((1+x)^b + x) + x (1+x)^{a+b}
  empty(n)           I = (1+x)^n

For each family the exact minimum over r of  Q_r / ((r+1) p_{r-1} p_{r+1})  is
printed for a range of n, together with the argmin r, using exact fractions.
This documents how tight ISO is along these families (the ratio tends to 0 for
fixed r as n grows), which any universal certificate must reproduce exactly.
"""

from __future__ import annotations

from fractions import Fraction
from math import comb
from typing import List, Tuple

from indpoly import poly_add, poly_mul


def binom_poly(k: int) -> List[int]:
    return [comb(k, i) for i in range(k + 1)]


def star(m: int) -> List[int]:
    return poly_add(binom_poly(m), [0, 1])


def star_iso(m: int, k: int) -> List[int]:
    return poly_mul(star(m), binom_poly(k))


def double_broom(a: int, b: int) -> List[int]:
    return poly_add(poly_mul(star(a), star(b)), poly_mul([0, 1], binom_poly(a + b)))


def min_iso_ratio(p: List[int], prefix_only: bool = False) -> Tuple[Fraction, int]:
    alpha = len(p) - 1
    L = -((-(2 * alpha - 1)) // 3)
    best = None
    for r in range(1, alpha):
        if prefix_only and not (2 <= r <= L - 1):
            continue
        a, b, c = p[r - 1], p[r], p[r + 1]
        den = (r + 1) * a * c
        if den == 0:
            continue
        Q = r * b * b + a * a - den
        fr = Fraction(Q, den)
        if best is None or fr < best[0]:
            best = (fr, r)
    return best


def main() -> None:
    print("family            n    min ratio (prefix r)     argmin r   ratio*n^2")
    for n in [10, 20, 40, 80, 160, 320]:
        fr, r = min_iso_ratio(star(n - 1), prefix_only=True)
        print(f"star K1,{n-1:<8d} {n:4d}  {float(fr):.6e}   r={r:2d}   {float(fr)*n*n:.4f}")
    print()
    for n in [12, 20, 40, 80, 160]:
        fr, r = min_iso_ratio(star_iso(n - 5, 4), prefix_only=True)
        fr2, r2 = min_iso_ratio(star_iso(n - 8, 7), prefix_only=True)
        print(f"K1,{n-5}+4K1  n={n:3d}: {float(fr):.6e} (r={r});   K1,{n-8}+7K1: {float(fr2):.6e} (r={r2})")
    print()
    for n in [22, 40, 80, 160]:
        best = None
        for a in range(1, n - 2):
            b = n - 3 - a
            if b < a:
                break
            fr, r = min_iso_ratio(double_broom(a, b), prefix_only=True)
            if best is None or fr < best[0]:
                best = (fr, r, a, b)
        fr, r, a, b = best
        print(f"double broom n={n:3d}: tightest (a,b)=({a},{b}) ratio={float(fr):.6e} at r={r}")
    print()
    for n in [20, 40, 80, 160, 320]:
        fr, r = min_iso_ratio(binom_poly(n), prefix_only=True)
        print(f"empty forest n={n:3d}: {float(fr):.6e} at r={r}")
    # every value above is positive; assert on a broad grid
    for n in range(4, 200):
        assert min_iso_ratio(star(n - 1))[0] > 0
        assert min_iso_ratio(binom_poly(n))[0] > 0
        for k in (1, 2, 3, 4, 5, 6, 7, 8):
            if n - k >= 2:
                assert min_iso_ratio(star_iso(n - k, k))[0] > 0
    for n in range(5, 120):
        for a in range(1, n - 2):
            b = n - 3 - a
            if b < a:
                break
            assert min_iso_ratio(double_broom(a, b))[0] > 0, (a, b)
    print("\nall family cells positive on the tested grids (n < 200 stars/isolates/empty; n < 120 double brooms)")


if __name__ == "__main__":
    main()
