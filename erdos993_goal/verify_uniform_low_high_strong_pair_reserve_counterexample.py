#!/usr/bin/env python3
"""Exact counterexample to the proposed (0,*)+(2,*) strong-pair reserve.

This verifier is intentionally small.  It uses exact rational arithmetic for
the fixed witness and bounded diagnostic survey, and SymPy only to replay the
one-parameter polynomial identity.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_strong_pair_reserve_counterexample_exact_20260827.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def write_json_atomic(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def ratios_from_gaps(gaps: list[int], terminal: int = 1) -> list[Fraction]:
    ratios = [Fraction(0)] * (len(gaps) + 1)
    ratios[-1] = Fraction(terminal)
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def factorial_row(ratios) -> list:
    row = [ratios[0] * 0 + 1]
    for index, ratio in enumerate(ratios):
        row.append(row[-1] * ratio / (index + 1))
    return row


def value(row, index: int):
    return row[index] if 0 <= index < len(row) else row[0] * 0


def kernel(row, rank: int, first: int, second: int):
    return (
        value(row, rank - 1 - first) * value(row, rank - second)
        - value(row, rank - first) * value(row, rank - 1 - second)
    )


def evaluate(rank: int, h, left_ratios, right_ratios) -> dict:
    left = factorial_row(left_ratios)
    right = factorial_row(right_ratios)
    capacity = left_ratios[2]

    def exponent(index: int) -> int:
        return int(index >= 3)

    def coefficient(first: int, second: int):
        first_adjusted = left_ratios[first] + first * h
        second_adjusted = left_ratios[second] + second * h
        correction = int(first == 2) - int(second == 2)
        return (
            (capacity + h * (exponent(first) + exponent(second)))
            * (first_adjusted - second_adjusted)
            + h * capacity * correction
        )

    def contribution(first: int, second: int):
        return (
            left[first]
            * left[second]
            * kernel(right, rank, first, second)
            * coefficient(first, second)
        )

    zero_terms = [contribution(0, second) for second in range(1, rank + 1)]
    two_terms = [contribution(2, second) for second in range(3, rank + 1)]
    reserve = sum(zero_terms + two_terms, Fraction(0))
    negative_magnitude = (
        h
        * capacity
        * left[1]
        * left[2]
        * kernel(right, rank, 1, 2)
    )
    return {
        "left": left,
        "right": right,
        "reserve": reserve,
        "negative_magnitude": negative_magnitude,
        "margin": reserve - negative_magnitude,
        "zero_terms": zero_terms,
        "two_terms": two_terms,
        "kernel_12": kernel(right, rank, 1, 2),
    }


def validate_gaps(left_ratios, right_ratios, h) -> None:
    assert left_ratios[0] - left_ratios[1] >= 2 * h
    assert left_ratios[1] - left_ratios[2] == h
    assert all(
        left_ratios[index] - left_ratios[index + 1] >= h
        for index in range(2, len(left_ratios) - 1)
    )
    assert right_ratios[0] - right_ratios[1] >= 2 * h
    assert all(
        right_ratios[index] - right_ratios[index + 1] >= h
        for index in range(1, len(right_ratios) - 1)
    )


def exact_survey() -> dict:
    slacks = (1, 3, 7, 11, 31, 127)
    cases = 0
    failures = 0
    first_failure = None
    worst = None

    for rank in (8, 9, 10, 11, 12):
        tight_left = ratios_from_gaps([2] + [1] * (rank - 1))
        tight_right = ratios_from_gaps([2] + [1] * (rank - 1))
        families = [("tight", tight_left, tight_right)]

        for right_index in range(rank):
            for slack in slacks:
                gaps = [2] + [1] * (rank - 1)
                gaps[right_index] += slack
                families.append(
                    (
                        f"B_gap{right_index}_plus{slack}",
                        tight_left,
                        ratios_from_gaps(gaps),
                    )
                )

        for left_index in [0] + list(range(2, rank)):
            left_gaps = [2] + [1] * (rank - 1)
            left_gaps[left_index] += 3
            for right_index in sorted({rank - 4, rank - 3, rank - 2}):
                right_gaps = [2] + [1] * (rank - 1)
                right_gaps[right_index] += 31
                families.append(
                    (
                        f"A_gap{left_index}_plus3_B_gap{right_index}_plus31",
                        ratios_from_gaps(left_gaps),
                        ratios_from_gaps(right_gaps),
                    )
                )

        for name, left_ratios, right_ratios in families:
            validate_gaps(left_ratios, right_ratios, Fraction(1))
            result = evaluate(rank, Fraction(1), left_ratios, right_ratios)
            cases += 1
            if result["margin"] < 0:
                failures += 1
                record = {
                    "rank": rank,
                    "family": name,
                    "margin": str(result["margin"]),
                    "reserve_over_negative": str(
                        result["reserve"] / result["negative_magnitude"]
                    ),
                }
                if first_failure is None:
                    first_failure = record
                if (
                    worst is None
                    or result["reserve"] * worst["negative_magnitude"]
                    < worst["reserve"] * result["negative_magnitude"]
                ):
                    worst = {
                        **record,
                        "reserve": result["reserve"],
                        "negative_magnitude": result["negative_magnitude"],
                    }

    assert cases == 440
    assert failures == 33
    assert first_failure == {
        "rank": 8,
        "family": "B_gap5_plus11",
        "margin": "-156487350726",
        "reserve_over_negative": "4767067/4969440",
    }
    return {
        "cases": cases,
        "failures": failures,
        "rank_range": [8, 12],
        "families": (
            "tight rows; every single right-gap slack in {1,3,7,11,31,127}; "
            "and sparse left-gap-plus3/right-near-tail-gap-plus31 crosses"
        ),
        "first_failure": first_failure,
        "worst_reserve_over_negative": worst["reserve_over_negative"],
        "worst_family": worst["family"],
        "worst_rank": worst["rank"],
    }


def symbolic_family() -> dict:
    parameter = sp.symbols("L", integer=True, positive=True)
    rank = 8
    h = sp.Integer(1)
    left_ratios = list(map(sp.Integer, (10, 8, 7, 6, 5, 4, 3, 2, 1)))
    right_ratios = [
        parameter + 9,
        parameter + 7,
        parameter + 6,
        parameter + 5,
        parameter + 4,
        parameter + 3,
        sp.Integer(3),
        sp.Integer(2),
        sp.Integer(1),
    ]
    result = evaluate(rank, h, left_ratios, right_ratios)
    reserve = sp.factor(result["reserve"])
    negative_magnitude = sp.factor(result["negative_magnitude"])

    reserve_polynomial = (
        15 * parameter**7
        + 5931 * parameter**6
        + 664004 * parameter**5
        + 26118570 * parameter**4
        + 501964195 * parameter**3
        + 5192534259 * parameter**2
        + 28024234506 * parameter
        + 62488680120
    )
    deficit_polynomial = (
        7825 * parameter**7
        + 263989 * parameter**6
        + 3135036 * parameter**5
        + 1959830 * parameter**4
        - 386108035 * parameter**3
        - 4933669779 * parameter**2
        - 27754675146 * parameter
        - 62412475320
    )
    common = (
        (parameter + 4)
        * (parameter + 5)
        * (parameter + 6)
        * (parameter + 7)
        * (parameter + 9)
    )
    expected_reserve = common * reserve_polynomial / sp.Integer(1451520)
    expected_negative = (
        (parameter + 3)
        * (parameter + 4) ** 2
        * (parameter + 5) ** 2
        * (parameter + 6) ** 2
        * (parameter + 7) ** 2
        * (parameter + 9) ** 2
        * (7 * parameter + 3)
        / sp.Integer(1296)
    )
    expected_deficit = common * deficit_polynomial / sp.Integer(1451520)
    assert sp.factor(reserve - expected_reserve) == 0
    assert sp.factor(negative_magnitude - expected_negative) == 0
    assert sp.factor(negative_magnitude - reserve - expected_deficit) == 0

    shifted_variable = sp.symbols("t", nonnegative=True)
    shifted = sp.Poly(
        sp.expand(deficit_polynomial.subs(parameter, shifted_variable + 12)),
        shifted_variable,
    )
    shifted_coefficients_descending = [int(item) for item in shifted.all_coeffs()]
    assert shifted_coefficients_descending == [
        7825,
        921289,
        45805044,
        1233534230,
        19024947485,
        160033613121,
        583316195166,
        116275430880,
    ]
    assert all(item > 0 for item in shifted_coefficients_descending)

    return {
        "parameter_domain": "integer L>=12",
        "right_ratios": "(L+9,L+7,L+6,L+5,L+4,L+3,3,2,1)",
        "right_gaps": "(2,1,1,1,1,L,1,1)",
        "reserve": str(expected_reserve),
        "negative_magnitude": str(expected_negative),
        "deficit_negative_minus_reserve": str(expected_deficit),
        "deficit_polynomial": str(deficit_polynomial),
        "shift_L_equals_t_plus_12_coefficients_descending": shifted_coefficients_descending,
        "strict_failure_reason": (
            "Every common factor is positive and the shifted deficit polynomial "
            "has strictly positive coefficients for t=L-12>=0."
        ),
        "reserve_over_negative_limit_as_L_to_infinity": str(
            sp.limit(reserve / negative_magnitude, parameter, sp.oo)
        ),
    }


def main() -> int:
    rank = 8
    h = Fraction(1)
    left_ratios = list(map(Fraction, (10, 8, 7, 6, 5, 4, 3, 2, 1)))
    right_ratios = list(map(Fraction, (21, 19, 18, 17, 16, 15, 3, 2, 1)))
    validate_gaps(left_ratios, right_ratios, h)
    witness = evaluate(rank, h, left_ratios, right_ratios)

    assert witness["kernel_12"] == Fraction(6861926988, 5)
    assert witness["reserve"] == Fraction(3686191762554)
    assert witness["negative_magnitude"] == Fraction(3842679113280)
    assert witness["margin"] == Fraction(-156487350726)
    assert witness["reserve"] / witness["negative_magnitude"] == Fraction(
        4767067, 4969440
    )

    payload = {
        "schema": "uniform-low-high-strong-pair-reserve-counterexample-v1",
        "status": "FAIL_EXACT_COUNTEREXAMPLE_STRONG_PAIR_02_RESERVE_PAYMENT",
        "date": "2026-08-27",
        "scope": (
            "This disproves only the proposed payment by the sum of left "
            "strong-pair contributions T_(0,l) and T_(2,l). It does not "
            "disprove the full strong auxiliary or Erdos Problem 993."
        ),
        "normalization": (
            "p_0=q_0=1, p_(i+1)=p_i*A_i/(i+1), "
            "q_(i+1)=q_i*B_i/(i+1), and out-of-range q indices are zero"
        ),
        "witness": {
            "rank": rank,
            "h": str(h),
            "left_ratios": [str(item) for item in left_ratios],
            "left_gaps": ["2", "1", "1", "1", "1", "1", "1", "1"],
            "right_ratios": [str(item) for item in right_ratios],
            "right_gaps": ["2", "1", "1", "1", "1", "12", "1", "1"],
            "p": [str(item) for item in witness["left"]],
            "q": [str(item) for item in witness["right"]],
            "K_q_1_2": str(witness["kernel_12"]),
            "zero_row_terms": [str(item) for item in witness["zero_terms"]],
            "two_row_terms": [str(item) for item in witness["two_terms"]],
            "reserve": str(witness["reserve"]),
            "negative_magnitude": str(witness["negative_magnitude"]),
            "reserve_minus_negative": str(witness["margin"]),
            "reserve_over_negative": str(
                witness["reserve"] / witness["negative_magnitude"]
            ),
        },
        "infinite_counterexample_family": symbolic_family(),
        "bounded_exact_survey": exact_survey(),
        "producer": Path(__file__).name,
        "producer_sha256": sha256(Path(__file__)),
    }
    write_json_atomic(OUTPUT, payload)
    print(payload["status"])
    print(OUTPUT.name)
    print(sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
