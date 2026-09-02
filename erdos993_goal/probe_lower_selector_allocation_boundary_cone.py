"""Probe whether symmetrized path allocations share a boundary half-plane."""

from __future__ import annotations

import cmath
from math import pi

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from prove_lower_selector_duran_second_margin import allocation
from verify_lower_qsharp_reduction import gamma_to_palindromic, selector_gamma


def gamma_from_palindromic(row: list[int]) -> list[sp.Expr]:
    degree = len(row) - 1
    rem = [sp.Integer(value) for value in row]
    output = []
    for h in range(degree // 2 + 1):
        value = rem[h]
        output.append(value)
        for j in range(degree - 2 * h + 1):
            rem[h + j] -= value * sp.binomial(degree - 2 * h, j)
    assert all(value == 0 for value in rem)
    return output


def circular_width(angles: list[float]) -> float:
    if len(angles) <= 1:
        return 0.0
    values = sorted(angle % (2 * pi) for angle in angles)
    gaps = [values[index + 1] - values[index] for index in range(len(values) - 1)]
    gaps.append(values[0] + 2 * pi - values[-1])
    return 2 * pi - max(gaps)


def one_case(d: int, r: int, s: int) -> tuple[float, tuple | None]:
    N = d + r
    gamma = selector_gamma(N, s)
    M = len(gamma) - 1
    a = max(0, s - N + 1)
    gamma_hat = gamma[a:]
    m = len(gamma_hat) - 1
    P = d + s
    ambient = P - a
    p = P - 2 * a
    n = p // 2
    beta = sp.Rational(2 * (p % 2) - 1, 2)
    duran_s = n - m + 2
    A = float((duran_s - 1) * (duran_s + beta - 1))
    radius = A**0.5

    pieces = []
    for i in range((s + 1) // 2):
        mirror = s - i
        row = []
        for j in range(P + 1):
            value = sum(
                allocation(N, s, d, j, source_i, 0)
                - 2 * allocation(N, s, d, j, source_i, 1)
                + allocation(N, s, d, j, source_i, 2)
                for source_i in {i, mirror}
            )
            row.append(value)
        piece_gamma_full = gamma_from_palindromic(row)
        assert all(value == 0 for value in piece_gamma_full[M + 1 :])
        piece_gamma = piece_gamma_full[a : M + 1]
        pieces.append(duran_polynomial(ambient, piece_gamma))

    if s % 2 == 0:
        i = s // 2
        row = [
            allocation(N, s, d, j, i, 0)
            - 2 * allocation(N, s, d, j, i, 1)
            + allocation(N, s, d, j, i, 2)
            for j in range(P + 1)
        ]
        piece_gamma_full = gamma_from_palindromic(row)
        assert all(value == 0 for value in piece_gamma_full[M + 1 :])
        pieces.append(duran_polynomial(ambient, piece_gamma_full[a : M + 1]))

    total = sum((piece.as_expr() for piece in pieces), start=sp.Integer(0))
    assert sp.Poly(total - duran_polynomial(ambient, gamma_hat).as_expr(), pieces[0].gens[0]).is_zero

    worst = 0.0
    witness = None
    for step in range(1, 48):
        theta = pi * step / 48
        z = radius * cmath.exp(1j * theta)
        values = [complex(piece.eval(z)) for piece in pieces]
        if any(abs(value) < 1e-20 for value in values):
            continue
        width = circular_width([cmath.phase(value) for value in values])
        if width > worst:
            worst = width
            witness = (d, r, s, theta, width, [cmath.phase(value) for value in values])
    return worst, witness


def main() -> None:
    overall = (0.0, None)
    failures = []
    for d in range(5, 8):
        for r in range(d - 4):
            N = d + r
            for s in range(r + 1, N + r + 1):
                result = one_case(d, r, s)
                if result[0] > overall[0]:
                    overall = result
                if result[0] >= pi - 1e-8:
                    failures.append(result[1])
    print("worst", overall)
    print("failures", len(failures))
    if failures:
        print(failures[:5])


if __name__ == "__main__":
    main()
