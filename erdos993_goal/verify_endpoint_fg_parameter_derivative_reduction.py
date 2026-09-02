"""Exact replay for the F/G parameter-derivative and vertical decomposition."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from itertools import combinations
from math import comb, lcm
from pathlib import Path

from flint import ctx, fmpz_poly


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_fg_parameter_derivative_exact_20260812.json"
ctx.prec = 160


def path(M: int) -> list[Fraction]:
    return [Fraction(comb(2 * M - i - 1, i)) for i in range(M)]


def add(
    left: list[Fraction],
    right: list[Fraction],
    scale: Fraction = Fraction(1),
) -> list[Fraction]:
    return [
        (left[i] if i < len(left) else 0)
        + scale * (right[i] if i < len(right) else 0)
        for i in range(max(len(left), len(right)))
    ]


def raw_slice(
    left: list[Fraction], right: list[Fraction], degree: int
) -> list[Fraction]:
    return [
        (left[i] if i < len(left) else 0)
        * (right[degree - i] if 0 <= degree - i < len(right) else 0)
        for i in range(degree + 1)
    ]


def gamma_from_palindromic(row: list[Fraction]) -> list[Fraction]:
    degree = len(row) - 1
    residual = list(row)
    gamma = []
    for h in range(degree // 2 + 1):
        value = residual[h]
        gamma.append(value)
        for j in range(degree - 2 * h + 1):
            residual[h + j] -= value * comb(degree - 2 * h, j)
    assert all(value == 0 for value in residual)
    return gamma


def mixed_gamma(
    left: list[Fraction], right: list[Fraction], degree: int
) -> list[Fraction]:
    row = raw_slice(left, right, degree)
    pal = [(value + reverse) / 2 for value, reverse in zip(row, reversed(row))]
    return gamma_from_palindromic(pal)


def shift_t(poly: list[Fraction]) -> list[Fraction]:
    return [Fraction(0)] + poly


def real_rooted(poly: list[Fraction]) -> bool:
    poly = list(poly)
    while len(poly) > 1 and poly[-1] == 0:
        poly.pop()
    denominator = 1
    for value in poly:
        denominator = lcm(denominator, value.denominator)
    integer_poly = fmpz_poly([
        value.numerator * (denominator // value.denominator) for value in poly
    ])
    return all(root.imag == 0 for root, _ in integer_poly.complex_roots())


def same(left: list[Fraction], right: list[Fraction]) -> bool:
    size = max(len(left), len(right))
    return left + [Fraction(0)] * (size - len(left)) == (
        right + [Fraction(0)] * (size - len(right))
    )


def main() -> None:
    identity_checks = 0
    pair_pencil_checks = 0
    u_values = [Fraction(1, 1000), Fraction(1), Fraction(1000)]
    c_values = [Fraction(0), Fraction(1, 10), Fraction(1), Fraction(10)]
    pencil_values = [Fraction(1, 1000), Fraction(1), Fraction(1000)]

    for N in range(5, 26):
        P = path(N)
        C = path(N - 1)
        D = path(N - 2)
        R = path(N - 3)
        V = add(P, C, Fraction(-1))
        W = add(C, D, Fraction(-1))
        assert V[0] == W[0] == 0
        S = V[1:]
        T = W[1:]
        assert same([2 * value for value in C], add(S, [Fraction(0)] + D))
        assert same([2 * value for value in D], add(T, [Fraction(0)] + R))

        for s in range(2, 2 * N - 5):
            n = s - 1
            for u in u_values:
                F = add(mixed_gamma(C, V, s), mixed_gamma(D, W, s), u)
                G = add(mixed_gamma(V, V, s), mixed_gamma(W, W, s), u)

                L_n = add(mixed_gamma(S, S, n), mixed_gamma(T, T, n), u)
                M_previous = add(
                    mixed_gamma(D, S, n - 1), mixed_gamma(R, T, n - 1), u
                )
                L_previous = add(
                    mixed_gamma(S, S, n - 1), mixed_gamma(T, T, n - 1), u
                )
                pieces = [
                    [value / 4 for value in L_n],
                    [value / 2 for value in shift_t(M_previous)],
                    shift_t(L_previous),
                ]

                for c in c_values:
                    A_c = add(C, V, c)
                    B_c = add(D, W, c)
                    K_c = add(mixed_gamma(A_c, A_c, s), mixed_gamma(B_c, B_c, s), u)
                    derivative_half = add(F, G, c)
                    expanded = add(add(pieces[0], pieces[1]), pieces[2], c)
                    assert same(derivative_half, expanded)
                    # K_c=E+2cF+c^2G and (1/2)dK_c/dc=F+cG.
                    E = add(mixed_gamma(C, C, s), mixed_gamma(D, D, s), u)
                    assert same(K_c, add(add(E, F, 2 * c), G, c * c))
                    identity_checks += 2

                # Finite evidence for the exact three-piece all-order target.
                for left, right in combinations(pieces, 2):
                    for coefficient in pencil_values:
                        assert real_rooted(add(left, right, coefficient))
                        pair_pencil_checks += 1

    report = {
        "status": "PASS_EXACT_ENDPOINT_FG_PARAMETER_DERIVATIVE_REPLAY",
        "scope": {"N": [5, 25], "all_layers": True},
        "identity_checks": identity_checks,
        "three_piece_positive_pencil_checks": pair_pencil_checks,
        "all_order_identities": [
            "K_c=E+2cF+c^2G and (1/2) partial_c K_c=F+cG",
            "F+cG=(1/4)L_n+(t/2)M_(n-1)+ctL_(n-1)",
        ],
        "remaining_target": (
            "Prove the three pairwise vertical/deletion compatibilities all-order; "
            "the root checks are finite evidence only."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
