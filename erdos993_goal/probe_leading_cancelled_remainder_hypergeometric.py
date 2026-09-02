#!/usr/bin/env python3
"""Test whether parity leading-cancelled remainders are hypergeometric."""

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
    reconstruct,
)


def leading_cancelled(original, reserve):
    result = [
        original[j] * reserve[-1] - reserve[j] * original[-1]
        for j in range(len(original))
    ]
    while result and result[-1] == 0:
        result.pop()
    return result


def compatible_degrees(values, numerator_degree, denominator_degree, prime):
    rows = []
    for index in range(len(values) - 1):
        left = values[index] % prime
        right = values[index + 1] % prime
        ratio = right * pow(left, -1, prime) % prime
        rows.append(
            [pow(index, degree, prime) for degree in range(numerator_degree + 1)]
            + [
                (-ratio * pow(index, degree, prime)) % prime
                for degree in range(denominator_degree + 1)
            ]
        )
    column_count = numerator_degree + denominator_degree + 2
    return rank_mod_prime(rows, prime) < column_count


def audit_part(values):
    tests = []
    first = None
    for total_degree in range(17):
        for numerator_degree in range(total_degree + 1):
            denominator_degree = total_degree - numerator_degree
            compatible = all(
                compatible_degrees(
                    values, numerator_degree, denominator_degree, prime
                )
                for prime in PRIMES
            )
            tests.append({
                "numerator_degree": numerator_degree,
                "denominator_degree": denominator_degree,
                "compatible_modulo_all_tested_primes": compatible,
            })
            if compatible:
                first = tests[-1]
                break
        if first:
            break
    return {
        "length": len(values),
        "first_compatible_rational_ratio": first,
        "test_count": len(tests),
    }


def audit(record, source):
    coefficient, reserve = reconstruct(record)
    parts = {}
    for parity_class in (0, 1):
        remainder = leading_cancelled(
            coefficient[parity_class::2], reserve[parity_class::2]
        )
        parts[str(parity_class)] = audit_part(remainder)
    return {
        "source": source,
        "package": record.get("package"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": int(record["r"]),
        "parts": parts,
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
    selected = [available[index] for index in (0, 1, 2)]
    records = [audit(record, source) for record, source in selected]
    report = {
        "status": "LEADING_CANCELLED_REMAINDER_HYPERGEOMETRIC_PROBE",
        "records": records,
        "warning": "Modular compatibility is necessary, not a construction.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "leading_cancelled_remainder_hypergeometric_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
