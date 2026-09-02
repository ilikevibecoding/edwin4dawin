#!/usr/bin/env python3
"""Test low-order differential representations of the original polynomial.

Let C(y) be the original affine increment coefficient polynomial and
R(y) the positive reserve polynomial.  A representation

  C(y)=sum_{s=0}^S a_s(y) R^(s)(y)

with low differential order S and low-degree multipliers a_s would
explain the observed bounded root defect through quasi-orthogonality.
This script gives exact modular nonexistence certificates when the
augmented coefficient matrix has full rank gap.
"""

from __future__ import annotations

from fractions import Fraction
import json
import math
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_moment_representation import (
    rank_mod_prime,
)


PRIMES = (1000000007, 1000000009)


def reconstruct(record: dict):
    ell = record["ell_values"]
    reserve = [int(value) for value in record["reserve_values"]]
    r = int(record["r"])
    numerator = [
        Fraction(-ell[j], math.comb(r + 1, j))
        + Fraction(-ell[j + 1], math.comb(r + 1, j + 1))
        for j in range(r + 1)
    ]
    reserve_unweighted = [
        Fraction(reserve[j], math.comb(r, j)) for j in range(r + 1)
    ]
    coefficient = [
        math.comb(r, j)
        * ((r + 1) * reserve_unweighted[j] - numerator[j])
        for j in range(r + 1)
    ]
    assert all(value.denominator == 1 for value in coefficient)
    return [int(value) for value in coefficient], reserve


def derivative(values: list[int], order: int) -> list[int]:
    result = list(values)
    for _ in range(order):
        result = [(j + 1) * result[j + 1] for j in range(len(result) - 1)]
    return result


def shifted(values: list[int], shift: int, length: int) -> list[int]:
    result = [0] * length
    for index, value in enumerate(values):
        if index + shift >= length:
            break
        result[index + shift] = value
    return result


def audit(record: dict, source: str) -> dict:
    coefficient, reserve = reconstruct(record)
    length = len(coefficient)
    tests = []
    for maximum_order in range(0, 5):
        derivatives = [derivative(reserve, order) for order in range(maximum_order + 1)]
        for multiplier_degree in range(0, 13):
            columns = [
                shifted(values, degree, length)
                for values in derivatives
                for degree in range(multiplier_degree + 1)
            ]
            rows = [
                [column[j] for column in columns]
                for j in range(length)
            ]
            modular = []
            certified_no = False
            compatible_all = True
            for prime in PRIMES:
                rank = rank_mod_prime(rows, prime)
                augmented_rank = rank_mod_prime(
                    [row + [coefficient[j]] for j, row in enumerate(rows)],
                    prime,
                )
                full_gap = (
                    len(columns) < length
                    and rank == len(columns)
                    and augmented_rank == len(columns) + 1
                )
                certified_no = certified_no or full_gap
                compatible_all = compatible_all and rank == augmented_rank
                modular.append(
                    {
                        "prime": prime,
                        "rank": rank,
                        "augmented_rank": augmented_rank,
                        "full_column_nonexistence_certificate": full_gap,
                    }
                )
            tests.append(
                {
                    "maximum_derivative_order": maximum_order,
                    "maximum_multiplier_degree": multiplier_degree,
                    "column_count": len(columns),
                    "certified_no_rational_representation": certified_no,
                    "compatible_modulo_all_tested_primes": compatible_all,
                    "modular": modular,
                }
            )
            if compatible_all:
                break
    return {
        "source": source,
        "package": record.get("package"),
        "parity": record.get("parity"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": int(record["r"]),
        "tests": tests,
        "first_modularly_compatible_test": next(
            (test for test in tests if test["compatible_modulo_all_tested_primes"]),
            None,
        ),
    }


def main() -> None:
    all_records = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        all_records.extend(
            (record, path.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )
    # One small defect case, one fully-real far case, and one bottom case
    # suffice to accept or reject the proposed uniform low-order mechanism.
    selected = [all_records[index] for index in (1, 0, 2)]
    records = []
    for record, source in selected:
        result = audit(record, source)
        records.append(result)
        print(
            result["package"], result["m"], result["x"], result["r"],
            result["first_modularly_compatible_test"], flush=True,
        )
    report = {
        "status": "ORIGINAL_RESERVE_DIFFERENTIAL_MODULE_PROBE",
        "records": records,
        "warning": (
            "A full-column modular rank gap certifies nonexistence over Q; "
            "modular compatibility alone does not construct a representation."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_reserve_differential_module_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
