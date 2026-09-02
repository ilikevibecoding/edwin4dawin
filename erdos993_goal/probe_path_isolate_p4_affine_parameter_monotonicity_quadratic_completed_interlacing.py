#!/usr/bin/env python3
"""Search for a quadratic-completed mixed recurrence with the reserve.

Motivated by completed interlacing, test whether a nonzero polynomial
q of degree at most two satisfies

  q(y) C(y) in span{ y^d R^(s)(y) : 0<=s<=S, 0<=d<=D }.

The intersection of the shifted-C space and reserve differential module
is computed exactly modulo two large primes.  This is a structural probe;
modular intersection is not by itself a rational identity.
"""

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
    derivative,
    reconstruct,
    shifted,
)


PRIMES = (1000000007, 1000000009)


def column_rank(columns: list[list[int]], prime: int) -> int:
    if not columns:
        return 0
    rows = [[column[j] for column in columns] for j in range(len(columns[0]))]
    return rank_mod_prime(rows, prime)


def audit(record: dict, source: str) -> dict:
    coefficient, reserve = reconstruct(record)
    length = len(coefficient)
    candidates = sorted(
        (
            (q_degree, maximum_order, multiplier_degree)
            for q_degree in range(0, 3)
            for maximum_order in range(0, 5)
            for multiplier_degree in range(0, 21)
        ),
        key=lambda item: (sum(item), item[0], item[1], item[2]),
    )
    tests = []
    first = None
    for q_degree, maximum_order, multiplier_degree in candidates:
        coefficient_columns = [
            shifted(coefficient, degree, length)
            for degree in range(q_degree + 1)
        ]
        reserve_columns = [
            shifted(derivative(reserve, order), degree, length)
            for order in range(maximum_order + 1)
            for degree in range(multiplier_degree + 1)
        ]
        modular = []
        positive_intersection_all = True
        for prime in PRIMES:
            coefficient_rank = column_rank(coefficient_columns, prime)
            reserve_rank = column_rank(reserve_columns, prime)
            combined_rank = column_rank(coefficient_columns + reserve_columns, prime)
            intersection_dimension = (
                coefficient_rank + reserve_rank - combined_rank
            )
            positive_intersection_all = (
                positive_intersection_all and intersection_dimension > 0
            )
            modular.append(
                {
                    "prime": prime,
                    "coefficient_shift_rank": coefficient_rank,
                    "reserve_module_rank": reserve_rank,
                    "combined_rank": combined_rank,
                    "intersection_dimension": intersection_dimension,
                }
            )
        test = {
            "q_degree": q_degree,
            "maximum_derivative_order": maximum_order,
            "maximum_multiplier_degree": multiplier_degree,
            "coefficient_shift_column_count": len(coefficient_columns),
            "reserve_module_column_count": len(reserve_columns),
            "positive_intersection_modulo_all_tested_primes": (
                positive_intersection_all
            ),
            "modular": modular,
        }
        tests.append(test)
        if positive_intersection_all:
            first = test
            break
    return {
        "source": source,
        "package": record.get("package"),
        "parity": record.get("parity"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": int(record["r"]),
        "first_modular_quadratic_completion": first,
        "test_count": len(tests),
        "tests": tests,
    }


def main() -> None:
    path = Path(DEFAULT_PATHS[0])
    data = json.loads(path.read_text(encoding="utf-8"))
    record = data["record"] if "record" in data else data["records"][0]
    result = audit(record, path.name)
    report = {
        "status": (
            "FOUND_MODULAR_QUADRATIC_COMPLETION_CANDIDATE"
            if result["first_modular_quadratic_completion"]
            else "NO_QUADRATIC_COMPLETION_IN_TESTED_MODULE"
        ),
        "record": result,
        "warning": (
            "A modular intersection is a candidate only and requires exact "
            "rational reconstruction; no intersection rules out that module "
            "when the modular ranks are generic."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "quadratic_completed_interlacing_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "case": [result["package"], result["m"], result["x"], result["r"]],
        "first": result["first_modular_quadratic_completion"],
        "test_count": result["test_count"],
    }, indent=2))


if __name__ == "__main__":
    main()
