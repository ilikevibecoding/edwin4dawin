#!/usr/bin/env python3
"""Exact mixed-family checks for the adaptive Jensen debt condition."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import ceil, comb
from pathlib import Path


def convolution(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        if not a:
            continue
        for j, b in enumerate(right):
            if b:
                result[i + j] += a * b
    return result


def mixed_polynomials(s: int, a: int) -> tuple[list[int], list[int], list[int]]:
    unit = [comb(s, j) * 2**j for j in range(s + 1)]
    large = [comb(a, j) for j in range(a + 1)]
    large[1] += 1
    k_poly = convolution(unit, large)
    m = s + a
    l_poly = [comb(m, j) for j in range(m + 1)]

    inside = k_poly + [0]
    for j, value in enumerate(l_poly):
        inside[j + 1] += value
    b_poly = convolution(inside, [1, 1])
    return k_poly, l_poly, b_poly


def quotient_coefficients(s: int, a: int) -> tuple[list[int], list[int]]:
    """Return K/S_1 and K/S_a for (1^s,a)."""
    if s:
        old_units = [comb(s - 1, j) * 2**j for j in range(s)]
        large = [comb(a, j) for j in range(a + 1)]
        large[1] += 1
        without_unit = convolution(old_units, large)
    else:
        without_unit = []
    without_large = [comb(s, j) * 2**j for j in range(s + 1)]
    return without_unit, without_large


def rational_record(value: Fraction) -> dict[str, object]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
    }


def evaluate_case(s: int, a: int, k: int) -> dict[str, object]:
    m = s + a
    k_poly, l_poly, b_poly = mixed_polynomials(s, a)
    without_unit, without_large = quotient_coefficients(s, a)
    debt = (
        k_poly[k + 1]
        * (l_poly[k - 1] + (l_poly[k - 2] if k >= 2 else 0))
        - k_poly[k] * (l_poly[k] + l_poly[k - 1])
    )
    coarse_exponent = ceil(k * k / m)
    coarse_ratio = Fraction(
        k_poly[k] ** 2 * 3**coarse_exponent,
        4**coarse_exponent * (k + 1) * debt,
    )
    h_unit = without_unit[k - 1] if k - 1 < len(without_unit) else 0
    h_large = without_large[k - 1] if k - 1 < len(without_large) else 0
    sigma = Fraction(
        4 * (s * h_unit * h_unit + h_large * h_large),
        k_poly[k] ** 2,
    )
    adaptive_exponent = (
        sigma.numerator + sigma.denominator - 1
    ) // sigma.denominator
    adaptive_ratio = Fraction(
        k_poly[k] ** 2 * 3**adaptive_exponent,
        4**adaptive_exponent * (k + 1) * debt,
    )
    log_concavity_gap = (
        k_poly[k] ** 2 - k_poly[k - 1] * k_poly[k + 1]
    )
    return {
        "s": s,
        "a": a,
        "M": m,
        "rooted_tree_order": 2 * s + a + 2,
        "k": k,
        "prefix_difference": b_poly[k + 1] - b_poly[k],
        "debt": debt,
        "coarse_exponent": coarse_exponent,
        "coarse_ratio": rational_record(coarse_ratio),
        "sigma": rational_record(sigma),
        "adaptive_exponent": adaptive_exponent,
        "adaptive_ratio": rational_record(adaptive_ratio),
        "pird_minor": log_concavity_gap - debt,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--s-max", type=int, default=50)
    parser.add_argument("--a-max", type=int, default=100)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("star_root_adaptive_jensen_mixed_20260729.json"),
    )
    args = parser.parse_args()

    checked = 0
    coarse_failures = 0
    first_coarse_failure = None
    first_adaptive_failure = None
    smallest_coarse_ratio = None
    smallest_adaptive_ratio = None

    for s in range(1, args.s_max + 1):
        for a in range(2, args.a_max + 1):
            m = s + a
            k_poly, l_poly, b_poly = mixed_polynomials(s, a)
            without_unit, without_large = quotient_coefficients(s, a)

            for k in range(1, m):
                if b_poly[k + 1] < b_poly[k]:
                    continue
                debt = (
                    k_poly[k + 1]
                    * (
                        l_poly[k - 1]
                        + (l_poly[k - 2] if k >= 2 else 0)
                    )
                    - k_poly[k] * (l_poly[k] + l_poly[k - 1])
                )
                if debt <= 0:
                    continue
                checked += 1

                coarse_exponent = ceil(k * k / m)
                coarse_ratio = Fraction(
                    k_poly[k] ** 2 * 3**coarse_exponent,
                    4**coarse_exponent * (k + 1) * debt,
                )
                if (
                    smallest_coarse_ratio is None
                    or coarse_ratio < smallest_coarse_ratio[0]
                ):
                    smallest_coarse_ratio = (
                        coarse_ratio,
                        s,
                        a,
                        k,
                        coarse_exponent,
                    )
                if coarse_ratio < 1:
                    coarse_failures += 1
                    if first_coarse_failure is None:
                        first_coarse_failure = (
                            s,
                            a,
                            k,
                            coarse_exponent,
                            coarse_ratio,
                        )

                h_unit = (
                    without_unit[k - 1]
                    if k - 1 < len(without_unit)
                    else 0
                )
                h_large = (
                    without_large[k - 1]
                    if k - 1 < len(without_large)
                    else 0
                )
                sigma = Fraction(
                    4 * (s * h_unit * h_unit + h_large * h_large),
                    k_poly[k] ** 2,
                )
                adaptive_exponent = (
                    sigma.numerator + sigma.denominator - 1
                ) // sigma.denominator
                adaptive_ratio = Fraction(
                    k_poly[k] ** 2 * 3**adaptive_exponent,
                    4**adaptive_exponent * (k + 1) * debt,
                )
                if (
                    smallest_adaptive_ratio is None
                    or adaptive_ratio < smallest_adaptive_ratio[0]
                ):
                    smallest_adaptive_ratio = (
                        adaptive_ratio,
                        s,
                        a,
                        k,
                        adaptive_exponent,
                        sigma,
                    )
                if adaptive_ratio < 1 and first_adaptive_failure is None:
                    first_adaptive_failure = (
                        s,
                        a,
                        k,
                        adaptive_exponent,
                        sigma,
                        adaptive_ratio,
                    )

    def unpack_coarse(record):
        if record is None:
            return None
        ratio, s, a, k, exponent = record
        return {
            "s": s,
            "a": a,
            "M": s + a,
            "rooted_tree_order": 2 * s + a + 2,
            "k": k,
            "exponent": exponent,
            "ratio": rational_record(ratio),
        }

    def unpack_adaptive(record):
        if record is None:
            return None
        ratio, s, a, k, exponent, sigma = record
        return {
            "s": s,
            "a": a,
            "M": s + a,
            "rooted_tree_order": 2 * s + a + 2,
            "k": k,
            "exponent": exponent,
            "sigma": rational_record(sigma),
            "ratio": rational_record(ratio),
        }

    report = {
        "status": (
            "ADAPTIVE_FAILURE_FOUND"
            if first_adaptive_failure is not None
            else "PASS_NOT_PROOF"
        ),
        "parameters": {"s_max": args.s_max, "a_max": args.a_max},
        "documented_coarse_witness": evaluate_case(11, 37, 25),
        "prefix_adverse_checks": checked,
        "coarse_failures": coarse_failures,
        "first_coarse_failure": (
            None
            if first_coarse_failure is None
            else unpack_coarse(
                (
                    first_coarse_failure[4],
                    first_coarse_failure[0],
                    first_coarse_failure[1],
                    first_coarse_failure[2],
                    first_coarse_failure[3],
                )
            )
        ),
        "smallest_coarse_ratio": unpack_coarse(smallest_coarse_ratio),
        "first_adaptive_failure": (
            None
            if first_adaptive_failure is None
            else unpack_adaptive(
                (
                    first_adaptive_failure[5],
                    first_adaptive_failure[0],
                    first_adaptive_failure[1],
                    first_adaptive_failure[2],
                    first_adaptive_failure[3],
                    first_adaptive_failure[4],
                )
            )
        ),
        "smallest_adaptive_ratio": unpack_adaptive(
            smallest_adaptive_ratio
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
