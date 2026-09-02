#!/usr/bin/env python3
"""Test quasi-orthogonality against neighboring reserve orders.

For fixed family parameters let R_s(y) be the reserve polynomial at
order s with its corresponding moving diagonal target.  A relation

  C_r(y)=sum_{h=0}^H a_h(y) R_(r-h)(y)

with H=2 and constant (or low-degree) multipliers would make C_r a
quasi-orthogonal polynomial of order two and explain its root defect.
"""

from __future__ import annotations

from fractions import Fraction
import json
import math
from pathlib import Path

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_moment_representation import (
    rank_mod_prime,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_original_reserve_differential_module import (
    shifted,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


PRIMES = (1000000007, 1000000009)


def original_from_saved(record: dict) -> list[int]:
    ell = record["ell_values"]
    reserve = record["reserve_values"]
    r = int(record["r"])
    numerator = [
        Fraction(-ell[j], math.comb(r + 1, j))
        + Fraction(-ell[j + 1], math.comb(r + 1, j + 1))
        for j in range(r + 1)
    ]
    reserve_unweighted = [
        Fraction(reserve[j], math.comb(r, j)) for j in range(r + 1)
    ]
    result = [
        math.comb(r, j)
        * ((r + 1) * reserve_unweighted[j] - numerator[j])
        for j in range(r + 1)
    ]
    assert all(value.denominator == 1 for value in result)
    return [int(value) for value in result]


def reserve_orders(record: dict, maximum_drop: int) -> list[list[int]]:
    package = record["package"]
    parity = int(record["parity"])
    coordinate = record["coordinate"]
    c_value = int(record.get("c") or 0)
    m_value = int(record["m"])
    x_value = int(record["x"])
    r = int(record["r"])
    _, reserve_source = reduced_sources(package, parity, coordinate)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    original_b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    reduced_b = original_b + 3
    result = []
    for drop in range(maximum_drop + 1):
        order = r - drop
        target = m_value + order + 5 + int(coordinate == "m")
        if package == "bottom":
            target -= 2
        values = aggregate(
            reserve_source, a, reduced_b, order, target,
            c_value, m_value, x_value,
        )
        result.append([int(value) for value in values])
    assert result[0] == [int(value) for value in record["reserve_values"]]
    return result


def audit(record: dict, source: str) -> dict:
    coefficient = original_from_saved(record)
    length = len(coefficient)
    orders = reserve_orders(record, 6)
    tests = []
    first = None
    candidates = sorted(
        (
            (maximum_drop, multiplier_degree)
            for maximum_drop in range(0, 7)
            for multiplier_degree in range(0, 7)
        ),
        key=lambda item: (sum(item), item),
    )
    for maximum_drop, multiplier_degree in candidates:
        columns = [
            shifted(order_values, degree, length)
            for order_values in orders[: maximum_drop + 1]
            for degree in range(multiplier_degree + 1)
        ]
        rows = [[column[j] for column in columns] for j in range(length)]
        modular = []
        compatible_all = True
        certified_no = False
        for prime in PRIMES:
            rank = rank_mod_prime(rows, prime)
            augmented_rank = rank_mod_prime(
                [row + [coefficient[j]] for j, row in enumerate(rows)], prime
            )
            compatible_all = compatible_all and rank == augmented_rank
            certified_no = certified_no or (
                len(columns) < length
                and rank == len(columns)
                and augmented_rank == len(columns) + 1
            )
            modular.append(
                {
                    "prime": prime,
                    "rank": rank,
                    "augmented_rank": augmented_rank,
                }
            )
        test = {
            "maximum_order_drop": maximum_drop,
            "maximum_multiplier_degree": multiplier_degree,
            "column_count": len(columns),
            "compatible_modulo_all_tested_primes": compatible_all,
            "certified_no_rational_representation": certified_no,
            "modular": modular,
        }
        tests.append(test)
        if compatible_all:
            first = test
            break
    return {
        "source": source,
        "package": record["package"],
        "parity": record["parity"],
        "coordinate": record["coordinate"],
        "m": record["m"],
        "x": record["x"],
        "r": record["r"],
        "first_modularly_compatible_test": first,
        "tests": tests,
    }


def main() -> None:
    path = Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "reaggregated_v_far_refutation_probe_20260802.json"
    )
    data = json.loads(path.read_text(encoding="utf-8"))
    record = data["record"] if "record" in data else data["records"][0]
    result = audit(record, path.name)
    report = {
        "status": (
            "FOUND_RESERVE_ORDER_QUASI_ORTHOGONALITY_CANDIDATE"
            if result["first_modularly_compatible_test"]
            else "NO_RESERVE_ORDER_QUASI_ORTHOGONALITY_IN_TESTED_MODULE"
        ),
        "record": result,
        "warning": "Modular compatibility requires exact rational reconstruction.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "reserve_order_quasi_orthogonality_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "first": result["first_modularly_compatible_test"],
        "test_count": len(result["tests"]),
    }, indent=2))


if __name__ == "__main__":
    main()
