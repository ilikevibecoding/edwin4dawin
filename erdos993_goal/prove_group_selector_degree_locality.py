#!/usr/bin/env python3
"""Exact replay for the selector-degree locality theorem.

The proof itself is algebraic.  If ``u_r,v_r`` are two continuant
solutions of the same monic three-term recurrence and

    A = sum_{j=0}^D w_j u_{m-j},
    B = sum_{j=0}^D w_j v_{m-j},       w_0 = 1,

then

    B/A - v_m/u_m = O(z^{-(2m-D+1)}).

Indeed, every cross determinant
``u_m v_{m-j} - v_m u_{m-j}`` has degree at most ``j-1``.  Consequently
the Laurent moments through order ``2L`` agree, where

    L = floor((2m-D-1)/2) = m - 1 - floor(D/2).

The Hankel/J-fraction formulas therefore give the same first ``L``
Jacobi couplings.  This script replays all polynomial degree bounds and
the Euclidean-coupling conclusion over exact rationals for a deterministic
family of recurrences and weights through a requested order.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_selector_degree_locality_theorem_20260805.json"


def trim(poly: list[Fraction]) -> list[Fraction]:
    while len(poly) > 1 and poly[-1] == 0:
        poly.pop()
    return poly


def add(left: list[Fraction], right: list[Fraction]) -> list[Fraction]:
    out = [Fraction(0)] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += value
    return trim(out)


def scale(poly: list[Fraction], scalar: Fraction) -> list[Fraction]:
    return trim([scalar * value for value in poly])


def multiply(left: list[Fraction], right: list[Fraction]) -> list[Fraction]:
    out = [Fraction(0)] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            out[i + j] += x * y
    return trim(out)


def y_minus(poly: list[Fraction], diagonal: Fraction) -> list[Fraction]:
    return add([Fraction(0)] + poly, scale(poly, -diagonal))


def continuants(order: int) -> tuple[list[list[Fraction]], list[list[Fraction]]]:
    # The deliberately nonsymmetric exact parameters exercise the generic
    # identities while keeping every base Jacobi coupling positive.
    u = [[Fraction(1)], [Fraction(-2), Fraction(1)]]
    v = [[Fraction(0)], [Fraction(1)]]
    for r in range(1, order):
        diagonal = Fraction(3 * r + 2, r + 2)
        coupling = Fraction((r + 1) * (2 * r + 1), r + 3)
        u.append(add(y_minus(u[-1], diagonal), scale(u[-2], -coupling)))
        v.append(add(y_minus(v[-1], diagonal), scale(v[-2], -coupling)))
    return u[: order + 1], v[: order + 1]


def degree(poly: list[Fraction]) -> int:
    return len(trim(poly[:])) - 1


def linear_combination(polys: list[list[Fraction]], weights: list[Fraction]) -> list[Fraction]:
    out = [Fraction(0)]
    for poly, weight in zip(polys, weights):
        out = add(out, scale(poly, weight))
    return out


def first_couplings(a: list[Fraction], b: list[Fraction], count: int) -> list[Fraction]:
    next_poly = scale(a, Fraction(1, a[-1]))
    current = scale(b, Fraction(1, b[-1]))
    answer: list[Fraction] = []
    for _ in range(count):
        d = degree(current)
        diagonal = current[d - 1] - next_poly[d]
        residual = add(y_minus(current, diagonal), scale(next_poly, -1))
        coupling = residual[d - 1]
        if coupling == 0:
            raise AssertionError("unexpected zero coupling in certified prefix")
        answer.append(coupling)
        next_poly, current = current, scale(residual, Fraction(1, coupling))
    return answer


def frac(value: Fraction) -> str:
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=40)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    checked_cross_determinants = 0
    checked_prefixes = 0
    samples = []
    for m in range(2, args.max_order + 1):
        u, v = continuants(m)
        base = first_couplings(u[m], v[m], m - 1)
        for d in range(m + 1):
            weights = [Fraction(1)] + [
                Fraction((j + 1) * (m + 2), 2 * j + 1) for j in range(1, d + 1)
            ]
            a = linear_combination([u[m - j] for j in range(d + 1)], weights)
            b = linear_combination([v[m - j] for j in range(d + 1)], weights)

            numerator = add(multiply(u[m], b), scale(multiply(v[m], a), -1))
            expected_bound = d - 1
            if d == 0:
                assert numerator == [Fraction(0)]
            else:
                assert degree(numerator) <= expected_bound
            checked_cross_determinants += d

            locality = (2 * m - d - 1) // 2
            locality = max(0, min(m - 1, locality))
            actual = first_couplings(a, b, locality)
            assert actual == base[:locality]
            checked_prefixes += 1

            if m in (4, 8, 16, args.max_order) and d in (0, m // 2, m):
                samples.append(
                    {
                        "tail_order": m,
                        "selector_degree": d,
                        "proved_universal_prefix": locality,
                        "exceptional_suffix_bound": (m - 1) - locality,
                        "first_base_coupling": frac(base[0]),
                    }
                )

    report = {
        "status": "ALL_ORDER_SELECTOR_DEGREE_LOCALITY_THEOREM",
        "theorem": {
            "rational_difference_order": "B/A-v_m/u_m = O(z^(-(2m-D+1)))",
            "universal_coupling_prefix": "floor((2m-D-1)/2)",
            "exceptional_coupling_suffix": "floor(D/2)",
            "full_selector_specialization": {
                "D": "m",
                "universal_prefix": "floor((m-1)/2)",
                "exceptional_suffix": "floor(m/2)",
            },
        },
        "proof_dependencies": [
            "continuant cross-determinant degree <= j-1",
            "denominator degree 2m",
            "Laurent moments agree through order 2L",
            "the first L J-fraction couplings depend only on moments 0..2L",
        ],
        "exact_replay": {
            "max_tail_order": args.max_order,
            "degree_bound_instances": checked_cross_determinants,
            "prefix_instances": checked_prefixes,
            "samples": samples,
        },
        "consequence": (
            "The experimentally observed half-prefix law is structural and "
            "holds at every layer.  Only the final floor(D/2) couplings can "
            "depend on a degree-D selector."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["exact_replay"], indent=2))
    print(args.output)


if __name__ == "__main__":
    main()
