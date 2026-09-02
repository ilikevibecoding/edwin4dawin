#!/usr/bin/env python3
"""Exact gamma identity and Sturm audit for the all-layer selector.

Let C_j be the pre-binomial row in the defect formula and write

    C(z) = sum_j C_j z^j = sum_h gamma_h z^h(1+z)^(p-2h).

The Newton coefficient of C_j/binom(p,j) is exactly
``gamma_h/(p)_(2h)``.  This follows from

    binom(p-2h,j-h)/binom(p,j)
      = (j)_h(p-j)_h/(p)_(2h)
      = prod_{r<h}(j(p-j)-r(p-r))/(p)_(2h).

The script verifies that identity independently and performs exact Sturm
counts for the newly observed gamma-root pattern: two roots in [1,infinity)
and all remaining roots on the negative axis.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from flint import fmpq, fmpq_poly

from probe_group_numeric_layer_jacobi_recurrence import selector


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_selector_gamma_root_pattern_probe_20260805.json"


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def convolution(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            out[i + j] += x * y
    return out


def add(left: list[int], right: list[int], right_scale: int = 1) -> list[int]:
    out = [0] * max(len(left), len(right))
    for i, value in enumerate(left):
        out[i] += value
    for i, value in enumerate(right):
        out[i] += right_scale * value
    return out


def binomial_row(order: int) -> list[int]:
    return [choose(order, j) for j in range(order + 1)]


def path_slice(order: int, layer: int) -> list[int]:
    return [
        choose(2 * order - i - 1, i)
        * choose(2 * order - layer + i - 1, layer - i)
        for i in range(layer + 1)
    ]


def pre_binomial_row(layer: int, alpha: int, slack: int) -> tuple[int, list[int]]:
    p = alpha + slack + 2 * layer + 5
    n = p + alpha
    first = convolution(binomial_row(4), path_slice(n, layer))
    second = [0] + convolution(binomial_row(2), path_slice(n - 1, layer))
    third = [0, 0] + path_slice(n - 2, layer)
    return p, add(add(first, second, -2), third)


def gamma_coefficients(row: list[int], degree: int) -> list[int]:
    remainder = row + [0] * (degree + 1 - len(row))
    gamma: list[int] = []
    for h in range(degree // 2 + 1):
        coefficient = remainder[h]
        gamma.append(coefficient)
        basis = [0] * h + binomial_row(degree - 2 * h)
        for j, value in enumerate(basis):
            remainder[j] -= coefficient * value
    assert not any(remainder)
    return gamma


def falling(n: int, order: int) -> int:
    answer = 1
    for j in range(order):
        answer *= n - j
    return answer


def sturm_chain(coefficients: list[int]) -> list[fmpq_poly]:
    chain = [fmpq_poly(coefficients)]
    chain.append(chain[0].derivative())
    while chain[-1].degree() > 0:
        remainder = -(chain[-2] % chain[-1])
        if remainder.is_zero():
            break
        # Positive normalization controls coefficient growth and preserves
        # every Sturm sign variation.
        leading = remainder[remainder.degree()]
        positive_scale = leading if leading > 0 else -leading
        remainder = remainder / positive_scale
        chain.append(remainder)
    return chain


def sign_at(poly: fmpq_poly, point: str | fmpq) -> int:
    if point == "+inf":
        return 1 if poly[poly.degree()] > 0 else -1
    if point == "-inf":
        sign = 1 if poly[poly.degree()] > 0 else -1
        return sign if poly.degree() % 2 == 0 else -sign
    value = poly(point)
    return (value > 0) - (value < 0)


def variations(chain: list[fmpq_poly], point: str | fmpq) -> int:
    signs = [sign_at(poly, point) for poly in chain]
    signs = [sign for sign in signs if sign]
    return sum(left != right for left, right in zip(signs, signs[1:]))


def root_count(chain: list[fmpq_poly], left: str | fmpq, right: str | fmpq) -> int:
    return variations(chain, left) - variations(chain, right)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=80)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    parameter_points = [(0, 0), (1, 2), (5, 7), (20, 30)]
    records = []
    identity_checks = 0
    root_checks = 0
    for alpha, slack in parameter_points:
        maximum_degree = 0
        for layer in range(args.max_layer + 1):
            p, row = pre_binomial_row(layer, alpha, slack)
            degree = layer + 4
            gamma = gamma_coefficients(row, degree)
            _, newton = selector(layer, alpha, slack)
            assert len(gamma) == len(newton)
            for h, coefficient in enumerate(gamma):
                assert newton[h] == fmpq(coefficient, falling(p, 2 * h))
                identity_checks += 1

            polynomial = fmpq_poly(gamma)
            chain = sturm_chain(gamma)
            total = root_count(chain, "-inf", "+inf")
            negative = root_count(chain, "-inf", fmpq(0))
            if layer == 0:
                # gamma=(1-t)^2.
                assert gamma == [gamma[0], -2 * gamma[0], gamma[0]]
                assert total == 1 and negative == 0
            elif layer == 1:
                # One positive root is exactly 1; endpoint counting in a
                # Sturm chain needs separate handling.
                assert polynomial(fmpq(1)) == 0
                assert total == 2 and negative == 0
            else:
                below_one = root_count(chain, fmpq(0), fmpq(1))
                above_one = root_count(chain, fmpq(1), "+inf")
                assert polynomial(fmpq(1)) != 0
                assert total == polynomial.degree()
                assert negative == polynomial.degree() - 2
                assert below_one == 0
                assert above_one == 2
            maximum_degree = max(maximum_degree, polynomial.degree())
            root_checks += 1
        records.append(
            {
                "alpha": alpha,
                "slack": slack,
                "layers": args.max_layer + 1,
                "maximum_gamma_degree": maximum_degree,
            }
        )

    report = {
        "status": "ALL_ORDER_GAMMA_IDENTITY_EXACT_ROOT_PATTERN_PROBE",
        "proved_identity": (
            "If C(z)=sum_h gamma_h z^h(1+z)^(p-2h), then the h-th "
            "Newton coefficient of C_j/binom(p,j) is gamma_h/(p)_(2h)."
        ),
        "observed_exact_root_pattern": (
            "gamma has exactly two roots in [1,infinity) and every other "
            "root is negative (the layer-0 roots are both 1)."
        ),
        "identity_checks": identity_checks,
        "exact_sturm_checks": root_checks,
        "records": records,
        "scope": (
            "The gamma/Newton identity is an all-order coefficient proof. "
            "The root-location statement is exact finite evidence pending "
            "an all-order path-recurrence proof."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(args.output)


if __name__ == "__main__":
    main()
