#!/usr/bin/env python3
"""Exact all-order Newton certificates for new-leaf roots at e=1."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import numpy as np

from certify_rank8_e1_new_leaf_newton_cell import (
    evaluator,
    new_leaf_value,
    transform_axis,
)


# Conservative total-degree bounds from the weighted raw Delta monomials,
# using deg(c_j)=j, deg(H6)=6, and deg(H7)=7.
DEGREES = {0: 28, 1: 28, 2: 27, 3: 26}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify_cell(evaluate, rank: int, extended_arm: int, label: str, mapping, dimension: int):
    degree = DEGREES[rank]
    shape = (degree + 1,) * dimension
    values = np.empty(shape, dtype=object)
    minimum_value = None
    for index in itertools.product(range(degree + 1), repeat=dimension):
        A, B, C = mapping(index)
        value = new_leaf_value(evaluate, extended_arm, A, B, C)
        values[index] = value
        minimum_value = value if minimum_value is None else min(minimum_value, value)
    for axis in range(dimension):
        transform_axis(values, axis)
    coefficients = [int(value) for value in values.flat]
    negative = sum(value < 0 for value in coefficients)
    zero = sum(value == 0 for value in coefficients)
    origin = int(values[(0,) * dimension])
    assert origin > 0
    assert minimum_value > 0
    return {
        "label": label,
        "dimension": dimension,
        "degree_bound_each_axis": degree,
        "coefficients": len(coefficients),
        "negative": negative,
        "zero": zero,
        "positive": len(coefficients) - negative - zero,
        "minimum_coefficient": str(min(coefficients)),
        "positive_origin_coefficient": str(origin),
        "minimum_sampled_value": str(minimum_value),
    }


def main() -> None:
    rows = []
    totals = {"cells": 0, "coefficients": 0, "negative": 0, "zero": 0, "positive": 0}
    worst = None
    for rank in (0, 1, 2, 3):
        evaluate, source_terms = evaluator(rank)
        for extended_arm in (0, 1, 2):
            cells = []
            # Ordered source arms are a=A+1, b=a+B, c=b+C.  Source order
            # n=4+3A+2B+C.  A>=7 automatically gives n>=25>23.
            cells.append(
                certify_cell(
                    evaluate,
                    rank,
                    extended_arm,
                    "A>=7 bulk: A=A0+7",
                    lambda index: (index[0] + 7, index[1], index[2]),
                    3,
                )
            )
            # For A=0..6 retain exactly 2B+C>=19-3A.  Split at the first B
            # for which the condition is automatic, then fix smaller B and
            # shift C by the exact remaining threshold.
            for fixed_A in range(7):
                threshold = 19 - 3 * fixed_A
                bulk_B = (threshold + 1) // 2
                cells.append(
                    certify_cell(
                        evaluate,
                        rank,
                        extended_arm,
                        f"A={fixed_A}, B>=ceil({threshold}/2)={bulk_B}",
                        lambda index, fixed_A=fixed_A, bulk_B=bulk_B: (
                            fixed_A,
                            index[0] + bulk_B,
                            index[1],
                        ),
                        2,
                    )
                )
                for fixed_B in range(bulk_B):
                    c_shift = threshold - 2 * fixed_B
                    cells.append(
                        certify_cell(
                            evaluate,
                            rank,
                            extended_arm,
                            f"A={fixed_A}, B={fixed_B}, C>= {c_shift}",
                            lambda index, fixed_A=fixed_A, fixed_B=fixed_B, c_shift=c_shift: (
                                fixed_A,
                                fixed_B,
                                index[0] + c_shift,
                            ),
                            1,
                        )
                    )
            assert len(cells) == 45
            for cell in cells:
                totals["cells"] += 1
                for key in ("coefficients", "negative", "zero", "positive"):
                    totals[key] += cell[key]
                candidate = int(cell["minimum_coefficient"])
                if worst is None or candidate < worst[0]:
                    worst = (candidate, rank, extended_arm, cell["label"])
            rows.append(
                {
                    "Delta_rank": rank,
                    "extended_arm": extended_arm,
                    "source_expression_terms": source_terms,
                    "cells": cells,
                }
            )
            print(
                "CASE",
                rank,
                extended_arm,
                "NEG",
                sum(cell["negative"] for cell in cells),
                flush=True,
            )

    status = (
        "PASS_EXACT_RANK8_DELTA013_E1_NEW_LEAF_ROOTS_ALL_ORDER"
        if totals["negative"] == 0
        else "NEWTON_CELL_METHOD_OBSTRUCTION"
    )
    scout = Path(__file__).with_name(
        "rank8_delta013_e1_leaf_extension_scout_exact_20260820.json"
    )
    payload = {
        "status": status,
        "scope": (
            "newly inserted leaf as root, every ordered subdivided-claw source of "
            "order n>=23, every choice of extended arm, Delta0..Delta3"
        ),
        "ordered_coordinates": (
            "source arms (a,a+B,a+B+C), A=a-1>=0; source order "
            "n=4+3A+2B+C and n>=23 iff 3A+2B+C>=19"
        ),
        "no_gap_partition": [
            "A>=7",
            "A=0..6 with B>=ceil((19-3A)/2)",
            "A=0..6, smaller fixed B, C>=19-3A-2B",
        ],
        "degree_justification": (
            "path coefficient c_j has total arm-degree j; weighted raw monomial "
            "bounds are 28,28,27,26 for Delta0,1,2,3"
        ),
        "degree_bounds": {str(rank): degree for rank, degree in DEGREES.items()},
        "totals": totals,
        "worst_coefficient": {
            "value": str(worst[0]),
            "Delta_rank": worst[1],
            "extended_arm": worst[2],
            "cell": worst[3],
        },
        "cases": rows,
        "scout_dependency": {
            "file": scout.name,
            "sha256": sha256(scout),
        },
        "warning": (
            "This proves the new-leaf root orbit only. Old-root increment positivity "
            "is a separate requirement for the all-root induction."
        ),
    }
    output = Path(__file__).with_name(
        "rank8_delta013_e1_new_leaf_all_order_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("TOTALS", totals)
    print("WORST", worst)
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
