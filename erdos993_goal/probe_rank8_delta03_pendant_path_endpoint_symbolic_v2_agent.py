#!/usr/bin/env python3
"""Fast exact sparse replay of pendant-path endpoint comparisons.

This is the pure-integer sparse-polynomial version of the exploratory
relaxed-cone test.  E is the attachment-component contribution with its root
excluded and J=x*K is the contribution with its root included, so e0=j1=1
and j0=0.  A mixed coefficient is only a method obstruction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_pendant_path_endpoint_symbolic_v2_probe_agent_20260825.json"
VARIABLES = tuple([f"e{index}" for index in range(1, 9)] + [f"j{index}" for index in range(2, 9)])
VARIABLE_COUNT = len(VARIABLES)
Monomial = tuple[int, ...]
Polynomial = dict[Monomial, int]
ZERO_MONOMIAL = (0,) * VARIABLE_COUNT


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def constant(value: int) -> Polynomial:
    return {ZERO_MONOMIAL: value} if value else {}


def variable(index: int) -> Polynomial:
    monomial = [0] * VARIABLE_COUNT
    monomial[index] = 1
    return {tuple(monomial): 1}


def add(left: Polynomial, right: Polynomial) -> Polynomial:
    out = dict(left)
    for monomial, coefficient in right.items():
        value = out.get(monomial, 0) + coefficient
        if value:
            out[monomial] = value
        else:
            out.pop(monomial, None)
    return out


def scale(polynomial: Polynomial, scalar: int) -> Polynomial:
    if scalar == 0:
        return {}
    return {monomial: scalar * coefficient for monomial, coefficient in polynomial.items()}


def subtract(left: Polynomial, right: Polynomial) -> Polynomial:
    return add(left, scale(right, -1))


def multiply(left: Polynomial, right: Polynomial) -> Polynomial:
    if not left or not right:
        return {}
    out: Polynomial = {}
    for left_monomial, left_coefficient in left.items():
        for right_monomial, right_coefficient in right.items():
            monomial = tuple(a + b for a, b in zip(left_monomial, right_monomial))
            value = out.get(monomial, 0) + left_coefficient * right_coefficient
            if value:
                out[monomial] = value
            else:
                out.pop(monomial, None)
    return out


def product(*polynomials: Polynomial) -> Polynomial:
    out = constant(1)
    for polynomial in polynomials:
        out = multiply(out, polynomial)
    return out


def sum_scaled(rows: Iterable[tuple[int, Polynomial]]) -> Polynomial:
    out: Polynomial = {}
    for scalar, polynomial in rows:
        out = add(out, scale(polynomial, scalar))
    return out


def coefficient_sequence_e() -> list[Polynomial]:
    return [constant(1), *[variable(index) for index in range(8)]]


def coefficient_sequence_j() -> list[Polynomial]:
    return [{}, constant(1), *[variable(index) for index in range(8, 15)]]


E = coefficient_sequence_e()
J = coefficient_sequence_j()


def path(order: int) -> list[int]:
    assert order >= 0
    return [
        math.comb(order - rank + 1, rank)
        if order - rank + 1 >= rank
        else 0
        for rank in range(9)
    ]


def convolve(left: list[Polynomial], right: list[int]) -> list[Polynomial]:
    out: list[Polynomial] = [{} for _ in range(9)]
    for i, polynomial in enumerate(left):
        for j, coefficient in enumerate(right[: 9 - i]):
            if coefficient:
                out[i + j] = add(out[i + j], scale(polynomial, coefficient))
    return out


def add_sequences(left: list[Polynomial], right: list[Polynomial]) -> list[Polynomial]:
    return [add(a, b) for a, b in zip(left, right)]


def attached_prefix(edge_vertices: int) -> list[Polynomial]:
    assert edge_vertices >= 0
    return add_sequences(
        convolve(E, path(edge_vertices)),
        convolve(J, path(max(edge_vertices - 1, 0))),
    )


def smooth(core: list[Polynomial], rank: int, siblings: int) -> Polynomial:
    return sum_scaled(
        (math.comb(siblings, shift), core[rank - shift])
        for shift in range(min(rank, siblings) + 1)
    )


def residual(core: list[Polynomial], deleted: list[Polynomial], siblings: int) -> Polynomial:
    c7, c8 = core[7], core[8]
    h6, h7 = deleted[6], deleted[7]
    p7 = add(smooth(core, 7, siblings), h6)
    p8 = add(smooth(core, 8, siblings), h7)
    p9 = sum_scaled(
        (math.comb(siblings, shift), core[9 - shift])
        for shift in range(1, min(9, siblings) + 1)
    )
    q8 = sum_scaled((
        (16, multiply(p8, p8)),
        (-1, multiply(p7, p8)),
        (-18, multiply(p7, p9)),
    ))
    core_q = subtract(scale(multiply(c8, c8), 16), multiply(c7, c8))
    deleted_q = subtract(scale(multiply(h7, h7), 14), multiply(h6, h7))
    return sum_scaled((
        (8, product(c7, h6, q8)),
        (-8, product(h6, p7, core_q)),
        (-9, product(c7, p7, deleted_q)),
    ))


def deltas(core: list[Polynomial], deleted: list[Polynomial]) -> list[Polynomial]:
    values = [residual(core, deleted, siblings) for siblings in range(1, 5)]
    out = [values[0]]
    for _ in range(3):
        values = [subtract(right, left) for left, right in zip(values, values[1:])]
        out.append(values[0])
    return out


def record(polynomial: Polynomial) -> dict[str, object]:
    ordered = sorted(polynomial.items(), reverse=True)
    serial = json.dumps(
        [[list(monomial), str(coefficient)] for monomial, coefficient in ordered],
        separators=(",", ":"),
    ).encode()
    negatives = [(monomial, coefficient) for monomial, coefficient in ordered if coefficient < 0]
    return {
        "terms": len(ordered),
        "negative": len(negatives),
        "positive": sum(1 for _, coefficient in ordered if coefficient > 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
        "first_negative": (
            {"monomial": list(negatives[0][0]), "coefficient": str(negatives[0][1])}
            if negatives
            else None
        ),
    }


def evaluate(polynomial: Polynomial, values: tuple[int, ...]) -> int:
    assert len(values) == VARIABLE_COUNT
    total = 0
    for monomial, coefficient in polynomial.items():
        term = coefficient
        for exponent, value in zip(monomial, values):
            term *= value**exponent
        total += term
    return total


def numeric_sequence(sequence: list[Polynomial], values: tuple[int, ...]) -> list[int]:
    return [evaluate(polynomial, values) for polynomial in sequence]


def numeric_residual(core: list[int], deleted: list[int], siblings: int) -> int:
    def numeric_smooth(rank: int) -> int:
        return sum(
            math.comb(siblings, shift) * core[rank - shift]
            for shift in range(min(rank, siblings) + 1)
        )
    p7 = numeric_smooth(7) + deleted[6]
    p8 = numeric_smooth(8) + deleted[7]
    p9 = sum(
        math.comb(siblings, shift) * core[9 - shift]
        for shift in range(1, min(9, siblings) + 1)
    )
    return (
        8 * core[7] * deleted[6] * (16 * p8 * p8 - p7 * p8 - 18 * p7 * p9)
        - 8 * deleted[6] * p7 * (16 * core[8] * core[8] - core[7] * core[8])
        - 9 * core[7] * p7 * (14 * deleted[7] * deleted[7] - deleted[6] * deleted[7])
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-length", type=int, default=20)
    args = parser.parse_args()
    assert 2 <= args.max_length <= 80

    rows = []
    pass_counts = {"branch_endpoint": [0] * 4, "leaf_endpoint": [0] * 4, "either_endpoint": [0] * 4}
    total_cells = [0] * 4
    sanity_values = tuple(range(2, 2 + VARIABLE_COUNT))
    sanity_checks = 0
    for length in range(2, args.max_length + 1):
        core = attached_prefix(length)
        branch_deleted = convolve(E, path(length))
        leaf_deleted = attached_prefix(length - 1)
        branch_delta = deltas(core, branch_deleted)
        leaf_delta = deltas(core, leaf_deleted)
        for position in range(1, length):
            internal_deleted = convolve(
                attached_prefix(position - 1), path(length - position)
            )
            internal_delta = deltas(core, internal_deleted)
            if position == 1:
                numeric_core = numeric_sequence(core, sanity_values)
                numeric_deleted = numeric_sequence(internal_deleted, sanity_values)
                for siblings in range(1, 5):
                    assert evaluate(
                        residual(core, internal_deleted, siblings), sanity_values
                    ) == numeric_residual(numeric_core, numeric_deleted, siblings)
                    sanity_checks += 1
            comparisons = []
            for rank in range(4):
                branch_polynomial = subtract(internal_delta[rank], branch_delta[rank])
                leaf_polynomial = subtract(internal_delta[rank], leaf_delta[rank])
                branch = record(branch_polynomial)
                leaf = record(leaf_polynomial)
                branch_pass = branch["negative"] == 0
                leaf_pass = leaf["negative"] == 0
                pass_counts["branch_endpoint"][rank] += int(branch_pass)
                pass_counts["leaf_endpoint"][rank] += int(leaf_pass)
                pass_counts["either_endpoint"][rank] += int(branch_pass or leaf_pass)
                total_cells[rank] += 1
                comparisons.append({
                    "rank": rank,
                    "branch_endpoint_difference": branch,
                    "leaf_endpoint_difference": leaf,
                    "coefficientwise_dominated_by_either_endpoint": branch_pass or leaf_pass,
                })
            rows.append({"length": length, "internal_position": position, "comparisons": comparisons})

    payload = {
        "schema": "rank8-delta03-pendant-path-endpoint-symbolic-v2-probe-agent-v1",
        "status": "PROBE_ONLY",
        "method": "pure integer sparse polynomials",
        "path_lengths": [2, args.max_length],
        "internal_root_cells": len(rows),
        "generators": list(VARIABLES),
        "structural_substitutions": {"e0": 1, "j0": 0, "j1": 1},
        "numeric_sparse_replay_checks": sanity_checks,
        "pass_counts_by_delta": pass_counts,
        "total_cells_by_delta": total_cells,
        "all_cells_coefficientwise_dominated_by_either_endpoint": [
            pass_counts["either_endpoint"][rank] == total_cells[rank]
            for rank in range(4)
        ],
        "rows": rows,
        "scope_guard": (
            "Exact relaxed nonnegative E,J cone for the listed finite path lengths only. "
            "A coefficientwise PASS is a valid strong-cone identity on those lengths; "
            "mixed coefficients are only a method obstruction. No all-length, five-cubic-"
            "path, orbit, connected-Q8, or Problem-993 credit is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("PASS_COUNTS", json.dumps(pass_counts, sort_keys=True))
    print("TOTAL", total_cells)
    print("ALL", payload["all_cells_coefficientwise_dominated_by_either_endpoint"])
    print("SANITY", sanity_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
