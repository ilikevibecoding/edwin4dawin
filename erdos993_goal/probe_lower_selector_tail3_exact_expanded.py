"""Exact rational expanded probe for the three-coordinate tail Gram certificate.

This intentionally goes beyond the historical d<=14 audit.  It factors the
square-root scale out of the quotient recurrence: if

    h_j = R^(m-j) H_j,  R^2=A,

then every H_j is rational and satisfies

    H_j=(q_(m-j)-sum_(l=1)^j q_l A^l H_(j-l))/q_0.

Thus all energies and Gram minors can be evaluated exactly over QQ without
algebraic-number swell.
"""

from __future__ import annotations

from fractions import Fraction
from functools import lru_cache
from math import factorial

from verify_lower_qsharp_reduction import selector_gamma


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


def duran_coefficients(duran_n: int, gamma: list[object]) -> list[Fraction]:
    """Ascending q coefficients, exactly over QQ."""
    m = len(gamma) - 1
    result = [Fraction(0)] * (m + 1)
    for index, raw_gamma in enumerate(gamma):
        fall = factorial(duran_n) // factorial(duran_n - index)
        scale = Fraction(int(raw_gamma) * fall, 4**index)
        for degree, value in enumerate(rising_coefficients(m - index)):
            result[degree] += scale * value
    return result


def quotient_rationals(q: list[Fraction], A: Fraction) -> list[Fraction]:
    """Return H_j where h_j=R^(m-j)H_j."""
    m = len(q) - 1
    result: list[Fraction] = []
    for j in range(m):
        value = q[m - j]
        for shift in range(1, j + 1):
            value -= q[shift] * A**shift * result[j - shift]
        result.append(value / q[0])
    return result


def square_h(H: list[Fraction], A: Fraction, j: int) -> Fraction:
    m = len(H)
    return A ** (m - j) * H[j] ** 2


def one_case(d: int, r: int, row_s: int) -> dict[str, object]:
    path_n = d + r
    gamma = selector_gamma(path_n, row_s)
    forced = max(0, row_s - path_n + 1)
    gamma_hat = gamma[forced:]
    m = len(gamma_hat) - 1
    P = d + row_s
    p = P - 2 * forced
    n = p // 2
    beta = Fraction(1 if p % 2 else -1, 2)
    A = Fraction(n - m + 1) * (Fraction(n - m + 1) + beta)
    q = duran_coefficients(P - forced, gamma_hat)
    H = quotient_rationals(q, A)
    squares = [square_h(H, A, j) for j in range(m)]
    E = sum(squares[:-1], Fraction(0))
    F = sum(squares, Fraction(0))
    if m < 3:
        return {
            "d": d,
            "r": r,
            "row_s": row_s,
            "m": m,
            "A": A,
            "E": E,
            "F": F,
        }
    tail_energy = squares[-3] + squares[-2]
    # Both products contain R^4=A^2.
    last_hankel = A**2 * (H[-3] * H[-1] - H[-2] ** 2)
    W = last_hankel**2
    complement = squares[0] * tail_energy
    S3 = W + complement
    return {
        "d": d,
        "r": r,
        "row_s": row_s,
        "m": m,
        "A": A,
        "H": H,
        "squares": squares,
        "E": E,
        "F": F,
        "tail_energy": tail_energy,
        "W": W,
        "complement": complement,
        "S3": S3,
        "margin": S3 - (E + F - 1),
    }


def main() -> None:
    # First high-precision apparent failures from the expanded floating probe,
    # plus the earlier exact last-minor failure and the d<=14 minima.
    cases = [
        (5, 0, 4),
        (13, 5, 6),
        (19, 3, 8),
        (45, 40, 82),
        (47, 42, 86),
        (48, 36, 78),
        (48, 42, 58),
        (49, 32, 72),
        (49, 44, 90),
        (50, 45, 92),
    ]
    for params in cases:
        record = one_case(*params)
        print(
            params,
            "m", record["m"],
            "sign", (record["margin"] > 0) - (record["margin"] < 0),
            "S3/(E+F-1)", float(record["S3"] / (record["E"] + record["F"] - 1)),
            "W/(E+F)", float(record["W"] / (record["E"] + record["F"])),
        )


if __name__ == "__main__":
    main()
