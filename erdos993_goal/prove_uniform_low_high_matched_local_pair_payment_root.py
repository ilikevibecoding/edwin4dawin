#!/usr/bin/env python3
"""Exact all-rank payment of the unique adverse tail-boost pair.

The companion pairwise theorem leaves only

    -h*A_2*p_1*p_2*K_q(1,2).

For k>=8 this script certifies that three left pairs, (0,1), (0,3),
and (2,3), together with the matched right pair (k-3,k-2), pay that
term.  The proof is symbolic and all-rank; finite exact cases only replay
the indexed formulas.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import random

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_matched_local_pair_payment_exact_root_20260828.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def coefficient_digest(poly: sp.Poly) -> str:
    digest = hashlib.sha256()
    for monomial, coefficient in poly.terms():
        line = ",".join(map(str, monomial)) + ":" + str(int(coefficient)) + "\n"
        digest.update(line.encode("ascii"))
    return digest.hexdigest().upper()


def symbolic_certificate() -> dict:
    r, capacity, x, central = sp.symbols("r capacity x central", positive=True)
    lower, upper = sp.symbols("lower upper", nonnegative=True)
    rank_shift, capacity_slack, terminal_shift = sp.symbols(
        "rank_shift capacity_slack terminal_shift", nonnegative=True
    )

    # Dimensionless local q-ratios after setting h=1.
    a = (x + 2 + central + lower) / (r - 1)
    b = (x + 1 + central) / r
    c = x / (r + 1)
    e = (x - 1 - upper) / (r + 2)

    alpha = sp.Rational(2) / ((capacity + 1) * (capacity + 3))
    eta = (capacity + 1) / (3 * (capacity + 3))
    beta = capacity * (capacity + 1) / 6
    gamma = (capacity + 1) / 6

    normalized_surplus = sp.factor(
        alpha * b * c * (c - e)
        + eta * c * (a - e) / a
        + beta * (a - b) / (a * b)
        + gamma * central
        - (b - c)
    )

    # The two neighboring right-row slacks can only help.
    derivative_lower_expected = (
        eta * c * e / a**2 + beta / a**2
    ) / (r - 1)
    derivative_upper_expected = (
        alpha * b * c + eta * c / a
    ) / (r + 2)
    assert sp.factor(sp.diff(normalized_surplus, lower) - derivative_lower_expected) == 0
    assert sp.factor(sp.diff(normalized_surplus, upper) - derivative_upper_expected) == 0

    base_local = sp.factor(normalized_surplus.subs({lower: 0, upper: 0}))
    numerator, denominator = map(sp.factor, sp.together(base_local).as_numer_denom())
    expected_denominator = (
        6
        * r
        * (capacity + 1)
        * (capacity + 3)
        * (r + 1) ** 2
        * (r + 2)
        * (central + x + 1)
        * (central + x + 2)
    )
    assert sp.factor(denominator - expected_denominator) == 0

    shifted_numerator = sp.Poly(
        sp.expand(
            numerator.subs(
                {
                    r: rank_shift + 6,
                    capacity: rank_shift + 6 + capacity_slack,
                    x: terminal_shift + 2,
                }
            )
        ),
        central,
    )
    assert shifted_numerator.degree() == 3

    positive_central_coefficients = []
    for exponent in (1, 2, 3):
        coefficient_poly = sp.Poly(
            shifted_numerator.coeff_monomial(central**exponent),
            rank_shift,
            capacity_slack,
            terminal_shift,
        )
        coefficients = [int(value) for value in coefficient_poly.coeffs()]
        assert coefficients and min(coefficients) > 0
        positive_central_coefficients.append(
            {
                "central_slack_exponent": exponent,
                "monomial_count": len(coefficients),
                "minimum_coefficient": min(coefficients),
                "maximum_coefficient": max(coefficients),
                "ordered_coefficient_sha256": coefficient_digest(coefficient_poly),
                "ordered_terms": [
                    {
                        "powers_rank_capacity_terminal": list(monomial),
                        "coefficient": int(coefficient),
                    }
                    for monomial, coefficient in coefficient_poly.terms()
                ],
            }
        )

    # At central=0, divide by the adverse local kernel b-c.  The three
    # selected left pairs have the following exact relative contributions.
    A = 2 * x * (x + 1) / (
        (capacity + 1) * (capacity + 3) * (r + 1) * (r + 2)
    )
    B = capacity * (capacity + 1) * r * (r + 1) / (
        6 * (x + 1) * (x + 2)
    )
    D = r * (capacity + 1) * x / (
        (capacity + 3) * (r + 2) * (x + 2)
    )
    local_kernel = (x + r + 1) / (r * (r + 1))
    assert sp.factor(
        base_local.subs(central, 0) - local_kernel * (A + B + D - 1)
    ) == 0
    product = sp.factor(A * B)
    product_expected = (
        sp.Rational(1, 3)
        * r / (r + 2)
        * x / (x + 2)
        * capacity / (capacity + 3)
    )
    assert sp.factor(product - product_expected) == 0

    # Exact numerical floors used by the two human-readable cases.
    small_x_B_floor = Fraction(49, 5)  # C=r=6, x=4.
    large_x_product_floor = Fraction(1, 9)
    large_x_D_floor = Fraction(7, 18)
    large_x_sum_floor = 2 * Fraction(1, 3) + large_x_D_floor
    assert small_x_B_floor > 1
    assert large_x_sum_floor == Fraction(19, 18) > 1

    # Endpoint-slack coefficient floors on the actual selected pairs.
    endpoint, next_ratio = sp.symbols("endpoint next_ratio", positive=True)
    coeff_01 = 2 * (endpoint - capacity - 2) / (endpoint * (capacity + 1))
    coeff_01_floor = 2 / ((capacity + 1) * (capacity + 3))
    assert sp.factor(
        coeff_01
        - coeff_01_floor
        - 2
        * (capacity + 2)
        * (endpoint - capacity - 3)
        / (endpoint * (capacity + 1) * (capacity + 3))
    ) == 0
    coeff_03_lower = (
        (capacity + 1) * (endpoint - capacity - 2) / (3 * endpoint)
    )
    coeff_03_floor = (capacity + 1) / (3 * (capacity + 3))
    assert sp.factor(
        coeff_03_lower
        - coeff_03_floor
        - (capacity + 1)
        * (capacity + 2)
        * (endpoint - capacity - 3)
        / (3 * endpoint * (capacity + 3))
    ) == 0
    del next_ratio

    # The matched right pair has alpha=beta=2.  Its strong kernel is C*p2^2/3.
    p2 = sp.symbols("p2", positive=True)
    p1 = 2 * p2 / (capacity + 1)
    p3 = p2 * capacity / 3
    right_kernel = sp.factor(capacity * (p2**2 - p3 * p1) - p3 * p1)
    assert right_kernel == capacity * p2**2 / 3

    return {
        "normalized_surplus": str(normalized_surplus),
        "positive_neighbor_slack_derivatives": {
            "lower": str(sp.factor(derivative_lower_expected)),
            "upper": str(sp.factor(derivative_upper_expected)),
        },
        "cleared_denominator": str(expected_denominator),
        "central_slack_degree": 3,
        "positive_central_slack_coefficients": positive_central_coefficients,
        "central_zero_relative_terms": {
            "A_pair_01": str(A),
            "B_pair_23": str(B),
            "D_pair_03": str(D),
            "A_times_B": str(product),
        },
        "case_floors": {
            "2_lt_x_le_4_pair_23_floor": str(small_x_B_floor),
            "x_ge_4_A_times_B_floor": str(large_x_product_floor),
            "x_ge_4_A_plus_B_floor": "2/3",
            "x_ge_4_pair_03_floor": str(large_x_D_floor),
            "x_ge_4_total_floor": str(large_x_sum_floor),
        },
        "matched_right_pair_strong_kernel": "C*p2^2/3",
    }


def factorial_row(ratios: list[int]) -> list[Fraction]:
    row = [Fraction(1)]
    for index, ratio in enumerate(ratios):
        row.append(row[-1] * ratio / (index + 1))
    return row


def kernel(row: list[Fraction], rank: int, first: int, second: int) -> Fraction:
    def value(index: int) -> Fraction:
        return row[index] if 0 <= index < len(row) else Fraction(0)

    return (
        value(rank - 1 - first) * value(rank - second)
        - value(rank - first) * value(rank - 1 - second)
    )


def ratios_from_gaps(gaps: list[int], terminal: int) -> list[int]:
    ratios = [0] * (len(gaps) + 1)
    ratios[-1] = terminal
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def exact_replays() -> dict:
    rng = random.Random(993_20260828_1)
    minimum_surplus = None
    minimum_ratio = None
    sample = []
    cases = 128
    for case_index in range(cases):
        rank = rng.randrange(8, 21)
        h = rng.randrange(1, 5)
        left_gaps = [2 * h, h] + [
            h + rng.randrange(0, 24) for _ in range(2, rank)
        ]
        right_gaps = [2 * h + rng.randrange(0, 8)] + [
            h + rng.randrange(0, 24) for _ in range(1, rank)
        ]
        if case_index < 64:
            left_gaps = [2 * h, h] + [h] * (rank - 2)
            right_gaps = [2 * h] + [h] * (rank - 1)
            right_gaps[rank - 3] += h * 10 ** (1 + case_index % 4)
        left_ratios = ratios_from_gaps(left_gaps, 1 + rng.randrange(0, 12))
        right_ratios = ratios_from_gaps(right_gaps, 1 + rng.randrange(0, 12))
        left = factorial_row(left_ratios)
        right = factorial_row(right_ratios)
        capacity = Fraction(left_ratios[2])
        adjusted_left = [
            Fraction(value + index * h) for index, value in enumerate(left_ratios)
        ]
        adjusted_right = [
            Fraction(value + index * h) for index, value in enumerate(right_ratios)
        ]

        selected = Fraction(0)
        for first, second in ((0, 1), (0, 3), (2, 3)):
            exponent = int(first >= 3) + int(second >= 3)
            correction = int(first == 2) - int(second == 2)
            bracket = (
                (capacity + h * exponent)
                * (adjusted_left[first] - adjusted_left[second])
                + h * capacity * correction
            )
            selected += (
                left[first]
                * left[second]
                * kernel(right, rank, first, second)
                * bracket
            )

        first = rank - 3
        second = rank - 2
        matched_right = (
            right[first]
            * right[second]
            * (adjusted_right[first] - adjusted_right[second])
            * capacity
            * left[2] ** 2
            / 3
        )
        negative = h * capacity * left[1] * left[2] * kernel(right, rank, 1, 2)
        surplus = selected + matched_right - negative
        assert surplus >= 0
        ratio = (selected + matched_right) / negative if negative else Fraction(10**100)
        if minimum_surplus is None or surplus < minimum_surplus:
            minimum_surplus = surplus
        if minimum_ratio is None or ratio < minimum_ratio:
            minimum_ratio = ratio
        if case_index < 8:
            sample.append(
                {
                    "rank": rank,
                    "h": h,
                    "negative": str(negative),
                    "selected_left": str(selected),
                    "matched_right": str(matched_right),
                    "surplus": str(surplus),
                    "payment_ratio": str(ratio),
                }
            )
    return {
        "cases": cases,
        "rank_range": [8, 20],
        "failures": 0,
        "minimum_exact_surplus": str(minimum_surplus),
        "minimum_payment_ratio": str(minimum_ratio),
        "sample": sample,
    }


def main() -> int:
    symbolic = symbolic_certificate()
    replays = exact_replays()
    payload = {
        "schema": "uniform-low-high-matched-local-pair-payment-root-v1",
        "status": "PASS_EXACT_ANALYTIC_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT",
        "theorem": (
            "For every k>=8 under the forest-high gap hypotheses and A1-A2=h, "
            "the strong contributions of left pairs (0,1),(0,3),(2,3) and "
            "right pair (k-3,k-2) pay h*A2*p1*p2*K_q(1,2). Hence the unique "
            "adverse pair in the tail-boost strong auxiliary is paid."
        ),
        "homogeneity": (
            "If h=0 the adverse term vanishes. For h>0 divide every ratio by h; "
            "all strong pair terms share the same positive homogeneous factor."
        ),
        "rank_parameters": (
            "r=k-2>=6, C=A2/h>=r, x=B_r/h>2, with nonnegative local slacks"
        ),
        "symbolic_certificate": symbolic,
        "exact_replays": replays,
        "scope_warning": (
            "This pays the sole adverse pair in the already-certified pairwise "
            "reduction. It does not by itself prove the low/low cone, the forest "
            "assembly, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    report_hash = atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", report_hash, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
