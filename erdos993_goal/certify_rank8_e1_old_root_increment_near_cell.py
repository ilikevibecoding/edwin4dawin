#!/usr/bin/env python3
"""Exact Newton cells for old arm-root leaf-extension increments at fixed near."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import numpy as np

from certify_rank8_e1_new_leaf_newton_cell import evaluator, transform_axis
from scan_rank8_delta3_n28_e1_subdivided_claws import claw_poly, deletion_poly


DEGREES = {0: 28, 1: 28, 2: 27, 3: 26}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def increment_value(evaluate, extension: str, near: int, tail: int, B: int, C: int) -> int:
    old_arms = (near + tail + 1, B + 1, C + 1)
    root = (0, near + 1)
    old_core = claw_poly(old_arms)
    old_deleted = deletion_poly(old_arms, *root)
    new_arms = list(old_arms)
    new_arms[0 if extension == "root" else 1] += 1
    new_arms = tuple(new_arms)
    new_core = claw_poly(new_arms)
    new_deleted = deletion_poly(new_arms, *root)
    old_value = evaluate((*old_core[:9], old_deleted[6], old_deleted[7]))
    new_value = evaluate((*new_core[:9], new_deleted[6], new_deleted[7]))
    return new_value - old_value


def certify_cell(evaluate, rank, extension, near, label, mapping, dimension):
    degree = DEGREES[rank]
    shape = (degree + 1,) * dimension
    values = np.empty(shape, dtype=object)
    minimum_value = None
    for index in itertools.product(range(degree + 1), repeat=dimension):
        tail, B, C = mapping(index)
        value = increment_value(evaluate, extension, near, tail, B, C)
        values[index] = value
        minimum_value = value if minimum_value is None else min(minimum_value, value)
    for axis in range(dimension):
        transform_axis(values, axis)
    coefficients = [int(value) for value in values.flat]
    negative = sum(value < 0 for value in coefficients)
    zero = sum(value == 0 for value in coefficients)
    return {
        "label": label,
        "dimension": dimension,
        "coefficients": len(coefficients),
        "negative": negative,
        "zero": zero,
        "positive": len(coefficients) - negative - zero,
        "minimum_coefficient": str(min(coefficients)),
        "origin_coefficient": str(int(values[(0,) * dimension])),
        "minimum_sampled_increment": str(minimum_value),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=(0, 1, 2, 3), required=True)
    parser.add_argument("--extension", choices=("root", "other"), required=True)
    parser.add_argument("--near", type=int, choices=range(7), required=True)
    args = parser.parse_args()
    evaluate, source_terms = evaluator(args.rank)
    threshold = 19 - args.near
    cells = [
        certify_cell(
            evaluate,
            args.rank,
            args.extension,
            args.near,
            f"tail>={threshold}",
            lambda index, threshold=threshold: (index[0] + threshold, index[1], index[2]),
            3,
        )
    ]
    for fixed_tail in range(threshold):
        remainder = threshold - fixed_tail
        cells.append(
            certify_cell(
                evaluate,
                args.rank,
                args.extension,
                args.near,
                f"tail={fixed_tail}, B>={remainder}",
                lambda index, fixed_tail=fixed_tail, remainder=remainder: (
                    fixed_tail,
                    index[0] + remainder,
                    index[1],
                ),
                2,
            )
        )
        for fixed_B in range(remainder):
            c_shift = remainder - fixed_B
            cells.append(
                certify_cell(
                    evaluate,
                    args.rank,
                    args.extension,
                    args.near,
                    f"tail={fixed_tail}, B={fixed_B}, C>={c_shift}",
                    lambda index, fixed_tail=fixed_tail, fixed_B=fixed_B, c_shift=c_shift: (
                        fixed_tail,
                        fixed_B,
                        index[0] + c_shift,
                    ),
                    1,
                )
            )
    negative = sum(cell["negative"] for cell in cells)
    minimum_sampled = min(int(cell["minimum_sampled_increment"]) for cell in cells)
    status = "PASS" if negative == 0 and minimum_sampled > 0 else "NEWTON_CELL_METHOD_OBSTRUCTION"
    payload = {
        "status": status,
        "scope": (
            f"old arm root with near={args.near}, {args.extension}-arm extension, "
            f"Delta{args.rank}; all tail,B=b-1,C=c-1>=0 with source order>=23"
        ),
        "no_gap_condition": f"tail+B+C>={threshold}",
        "source_expression_terms": source_terms,
        "cells": len(cells),
        "totals": {
            "coefficients": sum(cell["coefficients"] for cell in cells),
            "negative": negative,
            "zero": sum(cell["zero"] for cell in cells),
            "positive": sum(cell["positive"] for cell in cells),
            "minimum_sampled_increment": str(minimum_sampled),
            "minimum_coefficient": str(min(int(cell["minimum_coefficient"]) for cell in cells)),
        },
        "cell_rows": cells,
        "warning": "Negative Newton coefficients are method obstructions only.",
    }
    output = Path(__file__).with_name(
        f"rank8_e1_old_root_increment_delta{args.rank}_{args.extension}_near{args.near}_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status, payload["totals"])
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
