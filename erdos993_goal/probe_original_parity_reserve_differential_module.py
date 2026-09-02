#!/usr/bin/env python3
"""Test low-order reserve differential modules after parity splitting."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_moment_representation import (
    rank_mod_prime,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_original_reserve_differential_module import (
    PRIMES,
    derivative,
    reconstruct,
    shifted,
)


def audit_part(target: list[int], reserve: list[int]) -> dict:
    length = len(target)
    tests = []
    for maximum_order in range(5):
        derivatives = [
            derivative(reserve, order) for order in range(maximum_order + 1)
        ]
        for multiplier_degree in range(13):
            columns = [
                shifted(values, degree, length)
                for values in derivatives
                for degree in range(multiplier_degree + 1)
            ]
            rows = [[column[j] for column in columns] for j in range(length)]
            compatible = True
            certificates = []
            for prime in PRIMES:
                rank = rank_mod_prime(rows, prime)
                augmented = rank_mod_prime(
                    [row + [target[j]] for j, row in enumerate(rows)], prime
                )
                compatible &= rank == augmented
                certificates.append({
                    "prime": prime,
                    "rank": rank,
                    "augmented_rank": augmented,
                    "certified_gap": rank < augmented,
                })
            tests.append({
                "maximum_derivative_order": maximum_order,
                "maximum_multiplier_degree": multiplier_degree,
                "column_count": len(columns),
                "compatible_modulo_all_tested_primes": compatible,
                "modular": certificates,
            })
            if compatible:
                break
    return {
        "length": length,
        "first_modularly_compatible_test": next(
            (test for test in tests if test["compatible_modulo_all_tested_primes"]),
            None,
        ),
        "tests": tests,
    }


def audit(record: dict, source: str) -> dict:
    coefficient, reserve = reconstruct(record)
    return {
        "source": source,
        "package": record.get("package"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": int(record["r"]),
        "even": audit_part(coefficient[0::2], reserve[0::2]),
        "odd": audit_part(coefficient[1::2], reserve[1::2]),
    }


def main() -> None:
    available = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        available.extend(
            (record, path.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )
    selected = [available[index] for index in (1, 0, 2)]
    records = [audit(record, source) for record, source in selected]
    report = {
        "status": "ORIGINAL_PARITY_RESERVE_DIFFERENTIAL_MODULE_PROBE",
        "records": records,
        "warning": "Modular compatibility is necessary, not a construction.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_parity_reserve_differential_module_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps([
        {
            "package": r["package"], "m": r["m"], "r": r["r"],
            "even": r["even"]["first_modularly_compatible_test"],
            "odd": r["odd"]["first_modularly_compatible_test"],
        }
        for r in records
    ], indent=2))


if __name__ == "__main__":
    main()
