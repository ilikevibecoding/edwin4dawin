"""Fast exact FLINT sweep of the lower-selector W and S3 certificates."""

from __future__ import annotations

from functools import lru_cache
from math import comb, factorial
from time import perf_counter

from flint import fmpq


def binom(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def path_gamma(M: int, s: int) -> list[int]:
    coefficients = [
        binom(2 * M - i - 1, i) * binom(2 * M - s + i - 1, s - i)
        for i in range(s + 1)
    ]
    gamma: list[int] = []
    for j in range(s // 2 + 1):
        gamma.append(
            coefficients[j]
            - sum(gamma[h] * binom(s - 2 * h, j - h) for h in range(j))
        )
    return gamma


def selector_gamma(N: int, s: int) -> list[int]:
    rows = [path_gamma(N - q, s) for q in range(3)]
    result = [0] * (s // 2 + 3)
    for q, scale in enumerate((1, -2, 1)):
        for h, value in enumerate(rows[q]):
            result[h + q] += scale * value
    while result and result[-1] == 0:
        result.pop()
    return result


@lru_cache(maxsize=None)
def rising_coefficients(k: int) -> tuple[int, ...]:
    result = [1]
    for root in range(k):
        updated = [0] * (len(result) + 1)
        for degree, value in enumerate(result):
            updated[degree] += root * value
            updated[degree + 1] += value
        result = updated
    return tuple(result)


def duran_coefficients(duran_n: int, gamma: list[int]) -> list[fmpq]:
    m = len(gamma) - 1
    result = [fmpq(0)] * (m + 1)
    fall = 1
    for index, raw_gamma in enumerate(gamma):
        if index:
            fall *= duran_n - index + 1
        scale = fmpq(raw_gamma * fall, 4**index)
        for degree, value in enumerate(rising_coefficients(m - index)):
            result[degree] += scale * value
    return result


def one_case(d: int, r: int, row_s: int) -> tuple[int, fmpq, fmpq, fmpq]:
    path_n = d + r
    gamma = selector_gamma(path_n, row_s)
    forced = max(0, row_s - path_n + 1)
    gamma_hat = gamma[forced:]
    m = len(gamma_hat) - 1
    if m < 4:
        return m, fmpq(0), fmpq(0), fmpq(0)
    P = d + row_s
    p = P - 2 * forced
    n = p // 2
    A = fmpq(n - m + 1) * fmpq(2 * (n - m + 1) + (1 if p % 2 else -1), 2)
    q = duran_coefficients(P - forced, gamma_hat)
    H: list[fmpq] = []
    for j in range(m):
        value = q[m - j]
        for shift in range(1, j + 1):
            value -= q[shift] * A**shift * H[j - shift]
        H.append(value / q[0])
    squares = [A ** (m - j) * H[j] ** 2 for j in range(m)]
    E = sum(squares[:-1], fmpq(0))
    F = sum(squares, fmpq(0))
    last_hankel = A**2 * (H[-3] * H[-1] - H[-2] ** 2)
    W = last_hankel**2
    S3 = W + squares[0] * (squares[-3] + squares[-2])
    debt = E + F - 1
    return m, W - debt, S3 - 4 * debt, S3 / debt


def main(max_d: int = 50) -> None:
    started = perf_counter()
    count = 0
    w_failures: list[tuple[int, int, int, int, str]] = []
    s3_failures: list[tuple[int, int, int, int, str]] = []
    minimum: tuple[fmpq, tuple[int, int, int, int]] | None = None
    for d in range(5, max_d + 1):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                m, w_margin, s3_margin, ratio = one_case(d, r, row_s)
                if m < 4:
                    continue
                count += 1
                if w_margin <= 0:
                    w_failures.append((d, r, row_s, m, str(w_margin)))
                if s3_margin <= 0:
                    s3_failures.append((d, r, row_s, m, str(s3_margin)))
                if minimum is None or ratio < minimum[0]:
                    minimum = (ratio, (d, r, row_s, m))
        print(
            d,
            "cells", count,
            "W failures", len(w_failures),
            "S3 failures", len(s3_failures),
            "minimum", None if minimum is None else (float(minimum[0]), minimum[1]),
            flush=True,
        )
    print("seconds", perf_counter() - started)
    print("W_FAILURES", w_failures)
    print("S3_FAILURES", s3_failures)


def sweep_range(min_d: int, max_d: int) -> None:
    started = perf_counter()
    count = 0
    w_failures = []
    s3_failures = []
    minimum = None
    for d in range(min_d, max_d + 1):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                m, w_margin, s3_margin, ratio = one_case(d, r, row_s)
                if m < 4:
                    continue
                count += 1
                if w_margin <= 0:
                    w_failures.append((d, r, row_s, m, str(w_margin)))
                if s3_margin <= 0:
                    s3_failures.append((d, r, row_s, m, str(s3_margin)))
                if minimum is None or ratio < minimum[0]:
                    minimum = (ratio, (d, r, row_s, m))
        print(d, count, len(w_failures), len(s3_failures), flush=True)
    print("seconds", perf_counter() - started)
    print("MINIMUM", None if minimum is None else (float(minimum[0]), minimum[1]))
    print("W_FAILURES", w_failures)
    print("S3_FAILURES", s3_failures)


if __name__ == "__main__":
    main()
