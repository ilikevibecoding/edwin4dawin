"""Fast exact search for obstructions to the Section 107 block-energy bounds.

This is a diagnostic only.  The all-order claim still needs an analytic proof.
The implementation caches the path gamma rows because adjacent lower cells
reuse them heavily.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import sys

from flint import fmpq

from math import comb

from probe_lower_selector_tail3_flint_full import rising_coefficients


@lru_cache(maxsize=None)
def cached_path_gamma(n: int, s: int) -> tuple[int, ...]:
    # Section 74.6, written as a product of three binomial coefficients.
    R = 2 * n - s - 1
    result = []
    for h in range(s // 2 + 1):
        j = s - 2 * h
        result.append(sum(
            comb(R, j + k) * comb(j + k, k) * comb(2 * R + h - k, h - k)
            for k in range(h + 1)
            if 0 <= j + k <= R
        ))
    return tuple(result)


@lru_cache(maxsize=None)
def selector_gamma(n: int, s: int) -> tuple[int, ...]:
    rows = [cached_path_gamma(n - q, s) for q in range(3)]
    result = [0] * (s // 2 + 3)
    for q, scale in enumerate((1, -2, 1)):
        for h, value in enumerate(rows[q]):
            result[h + q] += scale * value
    while result and result[-1] == 0:
        result.pop()
    return tuple(result)


def normalized_duran_coefficients(N: int, gamma: tuple[int, ...]) -> list[fmpq]:
    """Return q_k/q_0 without ever forming the very large common scale."""
    m = len(gamma) - 1
    top = gamma[m]
    assert top
    result = [fmpq(0)] * (m + 1)
    result[0] = fmpq(1)
    denominator_falls = [1] * (m + 1)
    fall = 1
    for length in range(1, m + 1):
        fall *= N - m + length
        denominator_falls[m - length] = fall
    # (N)_m/(N)_h=(N-h)_(m-h), populated above by h.
    for degree in range(1, m + 1):
        value = fmpq(0)
        for h in range(m - degree + 1):
            value += fmpq(
                gamma[h] * 4 ** (m - h) * rising_coefficients(m - h)[degree],
                top * denominator_falls[h],
            )
        result[degree] = value
    return result


def main(max_d: int) -> None:
    best_block = None
    best_tail = None
    cells = checks = 0
    for d in range(5, max_d + 1):
        for r in range(d - 4):
            n_path = d + r
            for s in range(r + 1, n_path + r + 1):
                a = max(0, s - n_path + 1)
                gamma = list(selector_gamma(n_path, s)[a:])
                m = len(gamma) - 1
                if m < 7:
                    continue
                p = d + s - 2 * a
                n = p // 2
                x = n - m + 1
                A = fmpq(x) * fmpq(2 * x + (1 if p % 2 else -1), 2)
                if A > (m - 1) ** 2:
                    continue
                q = normalized_duran_coefficients(d + s - a, tuple(gamma))
                H = []
                for j in range(m):
                    value = q[m - j]
                    for ell in range(1, j + 1):
                        value -= q[ell] * A**ell * H[j - ell]
                    H.append(value / q[0])
                squares = [A ** (m - j) * H[j] ** 2 for j in range(m)]
                for j in range(m - 3):
                    denominator = sum(squares[j + 1 : j + 4], fmpq(0))
                    ratio = squares[j] / denominator
                    record = (ratio, (d, r, s, a, m, j))
                    if best_block is None or ratio > best_block[0]:
                        best_block = record
                    if 30 * squares[j] > denominator:
                        print("BLOCK_FAILURE", record)
                        return
                    checks += 1
                T = sum(squares[-3:], fmpq(0))
                W = A**4 * (H[-3] * H[-1] - H[-2] ** 2) ** 2
                ratio = W / T
                record = (ratio, (d, r, s, a, m))
                if best_tail is None or ratio < best_tail[0]:
                    best_tail = record
                if W <= 3 * T:
                    print("TAIL_FAILURE", record)
                    return
                cells += 1
        print(
            d,
            "cells", cells,
            "checks", checks,
            "best_block", None if best_block is None else (float(best_block[0]), best_block[1]),
            "best_tail", None if best_tail is None else (float(best_tail[0]), best_tail[1]),
            flush=True,
        )
    print("PASS_DIAGNOSTIC", max_d, best_block, best_tail)


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 50)
