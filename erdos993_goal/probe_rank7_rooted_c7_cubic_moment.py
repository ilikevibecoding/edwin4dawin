#!/usr/bin/env python3
"""Probe a cubic-moment sharpening of the finite rooted-C7 scalar cone.

This is deliberately a probe, not a theorem package.  The only new input is
the exact identity

    S3 = sum_v C(deg(v),3) + sum_uv (deg(u)-1)(deg(v)-1)

and Cauchy's lower bound on the first sum after x_v=deg(v)-1.
"""

from fractions import Fraction
from math import comb, ceil


def transfer(mu4: Fraction) -> Fraction:
    q = mu4.numerator // mu4.denominator
    assert q >= 3
    phi = Fraction((q - 1) * (q - 2), 2) + (mu4 - q) * (q - 1)
    return 2 * phi / mu4


def s3_floor(n: int, b2: int) -> int:
    sx = n - 2
    sx2 = 2 * b2 + sx
    cubic = Fraction(sx2 * sx2, sx)
    stars = (cubic - sx) / 6
    return max(n - 3 + b2, ceil(stars))


def i4_ceiling(n: int, b2: int) -> int:
    s2 = b2 + n - 2
    base = (
        comb(n, 4)
        - (n - 1) * comb(n - 2, 2)
        + comb(n - 1, 2)
        + (n - 4) * s2
    )
    return min(comb(n - 1, 4), base - s3_floor(n, b2))


def scalar(n: int, r: int, b2: int) -> Fraction | None:
    cap = i4_ceiling(n, b2)
    if cap <= 0:
        return None
    path = Fraction((n - 7) * (n - 8), n - 3)
    curv = Fraction(n**3 - 8 * n**2 - 19 * n + 302, 6)
    mu4 = path + curv * b2 / ((n - 3) * cap)
    x = transfer(mu4) / 6
    L = Fraction(n - r - 5, 5)
    return 1 + 2 * x - 28 * (L - x) / (1 + L)


def bounds(n: int, r: int) -> tuple[int, int]:
    return comb(r - 1, 2), comb(r - 1, 2) + comb(n - r - 1, 2)


def main() -> None:
    residual = []
    for n in range(23, 39):
        for r in range(1, 10):
            lo, hi = bounds(n, r)
            lo = max(lo, 5)
            if lo > hi:
                continue
            bad = [b for b in range(lo, hi + 1) if scalar(n, r, b) is not None and scalar(n, r, b) <= 0]
            if bad:
                residual.append((n, r, min(bad), max(bad), len(bad)))
    print(f"residual_cells={len(residual)} residual_levels={sum(x[4] for x in residual)}")
    for row in residual:
        print(row)


if __name__ == "__main__":
    main()
