#!/usr/bin/env python3
"""Exact quintic/quartic tail-Bezout derivation for homogeneous deficit s=6."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from flint import fmpq

from derive_group_fifth_homogeneous_tail_schur_flint import (
    A,
    ONE,
    Q,
    ZERO,
    Rat,
    determinant,
    falling,
    polynomial_add,
    polynomial_scale,
    polynomial_y_minus,
    product,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_seventh_homogeneous_tail_schur_flint_20260804.json"
LAYER = 6
TAIL_ORDER = 5
BANDWIDTH = 6


def selector_newton(p: Rat, alpha: Rat) -> list[Rat]:
    return [
        (alpha + p - 6)
        * (alpha + p - 5)
        * (alpha + p - 4)
        * (2 * alpha + 2 * p - 11)
        * (2 * alpha + 2 * p - 9)
        * (2 * alpha + 2 * p - 7)
        / 90,
        -(alpha + p - 5)
        * (2 * alpha + 2 * p - 9)
        * (
            4 * alpha**4
            + 16 * alpha**3 * p
            - 190 * alpha**3
            + 24 * alpha**2 * p**2
            - 570 * alpha**2 * p
            + 1970 * alpha**2
            + 16 * alpha * p**3
            - 570 * alpha * p**2
            + 3940 * alpha * p
            - 7835 * alpha
            + 4 * p**4
            - 190 * p**3
            + 1970 * p**2
            - 7835 * p
            + 11046
        )
        / (45 * p * (p - 1)),
        (
            8 * alpha**6
            + 48 * alpha**5 * p
            - 1044 * alpha**5
            + 120 * alpha**4 * p**2
            - 5220 * alpha**4 * p
            + 27410 * alpha**4
            + 160 * alpha**3 * p**3
            - 10440 * alpha**3 * p**2
            + 109640 * alpha**3 * p
            - 290835 * alpha**3
            + 120 * alpha**2 * p**4
            - 10440 * alpha**2 * p**3
            + 164460 * alpha**2 * p**2
            - 872505 * alpha**2 * p
            + 1514867 * alpha**2
            + 48 * alpha * p**5
            - 5220 * alpha * p**4
            + 109640 * alpha * p**3
            - 872505 * alpha * p**2
            + 3029734 * alpha * p
            - 3900006 * alpha
            + 8 * p**6
            - 1044 * p**5
            + 27410 * p**4
            - 290835 * p**3
            + 1514867 * p**2
            - 3900006 * p
            + 3998520
        )
        / (90 * falling(p, 4)),
        (
            4 * alpha**5
            + 20 * alpha**4 * p
            - 196 * alpha**4
            + 40 * alpha**3 * p**2
            - 784 * alpha**3 * p
            + 2923 * alpha**3
            + 40 * alpha**2 * p**3
            - 1176 * alpha**2 * p**2
            + 8769 * alpha**2 * p
            - 19361 * alpha**2
            + 20 * alpha * p**4
            - 784 * alpha * p**3
            + 8769 * alpha * p**2
            - 38722 * alpha * p
            + 60232 * alpha
            + 4 * p**5
            - 196 * p**4
            + 2923 * p**3
            - 19361 * p**2
            + 60232 * p
            - 72326
        )
        / falling(p, 6),
        (
            36 * alpha**4
            + 144 * alpha**3 * p
            - 892 * alpha**3
            + 216 * alpha**2 * p**2
            - 2676 * alpha**2 * p
            + 7929 * alpha**2
            + 144 * alpha * p**3
            - 2676 * alpha * p**2
            + 15858 * alpha * p
            - 30560 * alpha
            + 36 * p**4
            - 892 * p**3
            + 7929 * p**2
            - 30560 * p
            + 43552
        )
        / falling(p, 8),
        2
        * (3 * alpha + 3 * p - 16)
        * (
            6 * alpha**2
            + 12 * alpha * p
            - 63 * alpha
            + 6 * p**2
            - 63 * p
            + 166
        )
        / falling(p, 10),
    ]


def selector_newton_s7(p: Rat, alpha: Rat) -> list[Rat]:
    return [
        (alpha + p - 7)
        * (alpha + p - 6)
        * (alpha + p - 5)
        * (alpha + p - 4)
        * (2 * alpha + 2 * p - 13)
        * (2 * alpha + 2 * p - 11)
        * (2 * alpha + 2 * p - 9)
        / 315,
        -2
        * (alpha + p - 6)
        * (alpha + p - 5)
        * (2 * alpha + 2 * p - 11)
        * (
            4 * alpha**4
            + 16 * alpha**3 * p
            - 242 * alpha**3
            + 24 * alpha**2 * p**2
            - 726 * alpha**2 * p
            + 2918 * alpha**2
            + 16 * alpha * p**3
            - 726 * alpha * p**2
            + 5836 * alpha * p
            - 13327 * alpha
            + 4 * p**4
            - 242 * p**3
            + 2918 * p**2
            - 13327 * p
            + 21504
        )
        / (315 * p * (p - 1)),
        (
            8 * alpha**7
            + 56 * alpha**6 * p
            - 1428 * alpha**6
            + 168 * alpha**5 * p**2
            - 8568 * alpha**5 * p
            + 52934 * alpha**5
            + 280 * alpha**4 * p**3
            - 21420 * alpha**4 * p**2
            + 264670 * alpha**4 * p
            - 817215 * alpha**4
            + 280 * alpha**3 * p**4
            - 28560 * alpha**3 * p**3
            + 529340 * alpha**3 * p**2
            - 3268860 * alpha**3 * p
            + 6551342 * alpha**3
            + 168 * alpha**2 * p**5
            - 21420 * alpha**2 * p**4
            + 529340 * alpha**2 * p**3
            - 4903290 * alpha**2 * p**2
            + 19654026 * alpha**2 * p
            - 28998627 * alpha**2
            + 56 * alpha * p**6
            - 8568 * alpha * p**5
            + 264670 * alpha * p**4
            - 3268860 * alpha * p**3
            + 19654026 * alpha * p**2
            - 57997254 * alpha * p
            + 67736346 * alpha
            + 8 * p**7
            - 1428 * p**6
            + 52934 * p**5
            - 817215 * p**4
            + 6551342 * p**3
            - 28998627 * p**2
            + 67736346 * p
            - 65608200
        )
        / (315 * falling(p, 4)),
        2
        * (
            12 * alpha**6
            + 72 * alpha**5 * p
            - 860 * alpha**5
            + 180 * alpha**4 * p**2
            - 4300 * alpha**4 * p
            + 18965 * alpha**4
            + 240 * alpha**3 * p**3
            - 8600 * alpha**3 * p**2
            + 75860 * alpha**3 * p
            - 194285 * alpha**3
            + 180 * alpha**2 * p**4
            - 8600 * alpha**2 * p**3
            + 113790 * alpha**2 * p**2
            - 582855 * alpha**2 * p
            + 1038118 * alpha**2
            + 72 * alpha * p**5
            - 4300 * alpha * p**4
            + 75860 * alpha * p**3
            - 582855 * alpha * p**2
            + 2076236 * alpha * p
            - 2828750 * alpha
            + 12 * p**6
            - 860 * p**5
            + 18965 * p**4
            - 194285 * p**3
            + 1038118 * p**2
            - 2828750 * p
            + 3124500
        )
        / (15 * falling(p, 6)),
        2
        * (
            36 * alpha**5
            + 180 * alpha**4 * p
            - 1372 * alpha**4
            + 360 * alpha**3 * p**2
            - 5488 * alpha**3 * p
            + 19127 * alpha**3
            + 360 * alpha**2 * p**3
            - 8232 * alpha**2 * p**2
            + 57381 * alpha**2 * p
            - 127169 * alpha**2
            + 180 * alpha * p**4
            - 5488 * alpha * p**3
            + 57381 * alpha * p**2
            - 254338 * alpha * p
            + 411376 * alpha
            + 36 * p**5
            - 1372 * p**4
            + 19127 * p**3
            - 127169 * p**2
            + 411376 * p
            - 523728
        )
        / (3 * falling(p, 8)),
        4
        * (alpha + p - 6) ** 2
        * (
            18 * alpha**2
            + 36 * alpha * p
            - 213 * alpha
            + 18 * p**2
            - 213 * p
            + 634
        )
        / falling(p, 10),
    ]


def selector_for_layer(layer: int, p: Rat, alpha: Rat) -> list[Rat]:
    if layer == 6:
        return selector_newton(p, alpha)
    if layer == 7:
        return selector_newton_s7(p, alpha)
    raise ValueError(f"unsupported layer deficit {layer}")


def shifted_boundary_selector(p: Rat, offset: int, layer: int = 6) -> list[Rat]:
    kshift = layer - offset
    ambient = p + kshift
    formal_p = p + 2 * kshift
    formal_selector = selector_for_layer(layer, formal_p, Rat(-kshift))
    formal_nodes = [Rat(j) * (formal_p - j) for j in range(BANDWIDTH)]
    residual_nodes = [Rat(j) * (p - j) for j in range(BANDWIDTH)]
    values = []
    for h in range(BANDWIDTH):
        point = kshift * ambient + residual_nodes[h]
        values.append(
            sum(
                (
                    formal_selector[order]
                    * product(point - formal_nodes[j] for j in range(order))
                    for order in range(BANDWIDTH)
                ),
                ZERO,
            )
        )
    shifted: list[Rat] = []
    for h in range(BANDWIDTH):
        remainder = values[h] - sum(
            (
                shifted[order]
                * product(residual_nodes[h] - residual_nodes[j] for j in range(order))
                for order in range(h)
            ),
            ZERO,
        )
        shifted.append(
            remainder
            / product(residual_nodes[h] - residual_nodes[j] for j in range(h))
        )
    return shifted


def boundary_minimum(offset: int, parity: str, layer: int = 6) -> int:
    threshold = 3 * offset + 5 - layer
    cone_minimum = (threshold + 1) // 2 if parity == "even" else threshold // 2
    return max(TAIL_ORDER + 1, cone_minimum)


def derive(
    parity: str, offset: int | None = None, layer: int = 6
) -> tuple[list[Rat], list[Rat], list[list[Rat]], int | None]:
    if offset is None:
        p = A + Q + 2 * layer + 5
        n = p / 2 if parity == "even" else (p - 1) / 2
        alpha = A
        selector = selector_for_layer(layer, p, alpha)
        minimum = None
    else:
        minimum = boundary_minimum(offset, parity, layer)
        n = Q + minimum
        p = 2 * n if parity == "even" else 2 * n + 1
        alpha = Rat(layer - offset)
        selector = shifted_boundary_selector(p, offset, layer)
    beta = Rat(fmpq(-1, 2) if parity == "even" else fmpq(1, 2))
    ambient = p + alpha

    def top_coefficients(k: Rat) -> tuple[Rat, Rat]:
        total = alpha + beta
        c = -k * (k + alpha) / (2 * k + total)
        e = k * (k - 1) * (k + alpha - 1) * (k + alpha) / (
            2 * (2 * k + total - 1) * (2 * k + total)
        )
        return c, e

    def recurrence(k: Rat) -> tuple[Rat, Rat]:
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        diagonal = c - c_next
        return diagonal, e - e_next - diagonal * c

    actions = []
    for j in range(BANDWIDTH):
        k = n - j
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        upper = Rat(j)
        diagonal = k + (j + 1) * c - upper * c_next
        lower = (k - 1) * c + (j + 2) * e - upper * e_next - diagonal * c
        actions.append((upper, diagonal, lower))

    falling_vectors = [[ONE] + [ZERO] * (BANDWIDTH - 1)]
    for shift in range(BANDWIDTH - 1):
        output = [ZERO] * BANDWIDTH
        for j, coefficient in enumerate(falling_vectors[-1]):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < BANDWIDTH - 1:
                output[j + 1] += coefficient * lower
        falling_vectors.append(output)
    vector = [
        sum(
            (
                selector[h]
                * falling(ambient, h)
                * falling_vectors[h][index]
                for h in range(BANDWIDTH)
            ),
            ZERO,
        )
        for index in range(BANDWIDTH)
    ]
    connection = [value / vector[0] for value in vector]

    m = n - TAIL_ORDER
    U_previous, U = [ZERO], [ONE]
    V_previous, V = [-ONE], [ZERO]
    U_values, V_values = [U], [V]
    for step in range(TAIL_ORDER):
        diagonal, subdiagonal = recurrence(m + step)
        U_next = polynomial_add(
            polynomial_y_minus(U, diagonal),
            polynomial_scale(U_previous, -subdiagonal),
        )
        V_next = polynomial_add(
            polynomial_y_minus(V, diagonal),
            polynomial_scale(V_previous, -subdiagonal),
        )
        U_previous, U = U, U_next
        V_previous, V = V, V_next
        U_values.append(U)
        V_values.append(V)
    tail_A, tail_B = [ZERO], [ZERO]
    for j in range(BANDWIDTH):
        tail_A = polynomial_add(
            tail_A, polynomial_scale(U_values[TAIL_ORDER - j], connection[j])
        )
        tail_B = polynomial_add(
            tail_B, polynomial_scale(V_values[TAIL_ORDER - j], connection[j])
        )
    assert len(tail_A) == TAIL_ORDER + 1 and len(tail_B) == TAIL_ORDER
    tail_B = [value / tail_B[-1] for value in tail_B]

    matrix = [[ZERO for _ in range(TAIL_ORDER)] for _ in range(TAIL_ORDER)]
    padded_B = tail_B + [ZERO]
    for i in range(TAIL_ORDER + 1):
        for j in range(i):
            coefficient = tail_A[i] * padded_B[j] - tail_A[j] * padded_B[i]
            for k in range(i - j):
                matrix[i - 1 - k][j + k] += coefficient
    if matrix[0][0].evaluate(0, 1) < 0:
        matrix = [[-value for value in row] for row in matrix]
    return tail_A, tail_B, matrix, minimum


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("even", "odd"), default="even")
    parser.add_argument("--layer", type=int, choices=(6, 7), default=6)
    parser.add_argument("--offset", type=int)
    parser.add_argument("--max-minor", type=int, choices=(1, 2, 3, 4, 5), default=5)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    if args.offset is not None and not 0 <= args.offset < args.layer:
        parser.error("offset must satisfy 0 <= offset < layer")
    tail_A, tail_B, matrix, minimum = derive(args.parity, args.offset, args.layer)
    print("tail and Bezout matrix derived", flush=True)
    records = []
    for order in range(1, args.max_minor + 1):
        minor = determinant([row[:order] for row in matrix[:order]])
        record = {
            "order": order,
            "numerator_terms": len(list(minor.num.terms())),
            "denominator_terms": len(list(minor.den.terms())),
            "numerator_coefficientwise_positive": all(
                value > 0 for value in minor.num.coeffs()
            ),
            "denominator_coefficientwise_positive": all(
                value > 0 for value in minor.den.coeffs()
            ),
            "numerator_factorization": str(minor.num.factor()),
            "denominator_factorization": str(minor.den.factor()),
        }
        records.append(record)
        print(
            {key: value for key, value in record.items() if "factorization" not in key},
            flush=True,
        )
    report = {
        "status": "FLINT_SYMBOLIC_QUINTIC_TAIL_SCHUR_DERIVATION",
        "layer_deficit": args.layer,
        "parity": args.parity,
        "offset": args.offset,
        "jacobi_degree_shift": minimum,
        "A5": list(map(str, tail_A)),
        "B4_monic": list(map(str, tail_B)),
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
