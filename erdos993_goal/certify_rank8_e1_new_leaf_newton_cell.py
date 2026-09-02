#!/usr/bin/env python3
"""Exact Newton-basis cell probe for new-leaf roots of subdivided claws."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp

from scan_rank8_delta3_n28_e1_subdivided_claws import claw_poly, deletion_poly
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


DEGREES = {0: 27, 1: 27, 2: 26, 3: 25}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def evaluator(rank: int):
    variables = (*c[:9], h[6], h[7])
    terms = sp.Poly(
        newton_coefficients(residual())[rank], *variables, domain=sp.QQ
    ).terms()

    def evaluate(values: tuple[int, ...]) -> int:
        total = sp.S.Zero
        for monomial, coefficient in terms:
            term = coefficient
            for value, exponent in zip(values, monomial):
                term *= value**exponent
            total += term
        assert total.q == 1
        return int(total)

    return evaluate, len(terms)


def new_leaf_value(evaluate, extended_arm: int, A: int, B: int, C: int) -> int:
    shortest = A + 1
    old_arms = (shortest, shortest + B, shortest + B + C)
    new_arms = list(old_arms)
    new_arms[extended_arm] += 1
    new_arms = tuple(new_arms)
    core = claw_poly(new_arms)
    new_root = (extended_arm, new_arms[extended_arm])
    deleted = deletion_poly(new_arms, *new_root)
    assert deleted == claw_poly(old_arms)
    return evaluate((*core[:9], deleted[6], deleted[7]))


def difference_coefficients(line: list[int]) -> list[int]:
    out = []
    work = line
    while work:
        out.append(work[0])
        work = [work[index + 1] - work[index] for index in range(len(work) - 1)]
    return out


def transform_axis(values: np.ndarray, axis: int) -> None:
    moved = np.moveaxis(values, axis, 0)
    for index in np.ndindex(moved.shape[1:]):
        line = [int(moved[(position,) + index]) for position in range(moved.shape[0])]
        transformed = difference_coefficients(line)
        for position, value in enumerate(transformed):
            moved[(position,) + index] = value


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=(0, 1, 2, 3), required=True)
    parser.add_argument("--extended-arm", type=int, choices=(0, 1, 2), required=True)
    parser.add_argument("--a-shift", type=int, default=7)
    args = parser.parse_args()
    degree = DEGREES[args.rank]
    evaluate, source_terms = evaluator(args.rank)
    shape = (degree + 1, degree + 1, degree + 1)
    values = np.empty(shape, dtype=object)
    for A0 in range(degree + 1):
        for B in range(degree + 1):
            for C in range(degree + 1):
                values[A0, B, C] = new_leaf_value(
                    evaluate, args.extended_arm, A0 + args.a_shift, B, C
                )
    minimum_value = min(int(value) for value in values.flat)
    for axis in range(3):
        transform_axis(values, axis)
    coefficients = [int(value) for value in values.flat]
    negative = sum(value < 0 for value in coefficients)
    zero = sum(value == 0 for value in coefficients)
    positive = len(coefficients) - negative - zero
    status = "PASS" if negative == 0 else "NEWTON_CELL_METHOD_OBSTRUCTION"
    payload = {
        "status": status,
        "scope": (
            "new-leaf root value on ordered subdivided claws with "
            f"A=a-1>={args.a_shift}, B=b-a>=0, C=c-b>=0; rank {args.rank}, "
            f"extended arm {args.extended_arm}"
        ),
        "basis": "binomial(A-a_shift,i)*binomial(B,j)*binomial(C,k)",
        "degree_bound_each_axis": degree,
        "grid_shape": list(shape),
        "source_expression_terms": source_terms,
        "minimum_sampled_value": str(minimum_value),
        "coefficient_signs": {
            "negative": negative,
            "zero": zero,
            "positive": positive,
        },
        "minimum_newton_coefficient": str(min(coefficients)),
        "warning": (
            "A negative Newton coefficient is only a method obstruction; it is not a "
            "negative literal value."
        ),
    }
    output = Path(__file__).with_name(
        f"rank8_e1_new_leaf_newton_rank{args.rank}_arm{args.extended_arm}_ashift{args.a_shift}_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("SIGNS", negative, zero, positive, "MIN", min(coefficients))
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
