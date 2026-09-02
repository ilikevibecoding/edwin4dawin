#!/usr/bin/env python3
"""Pure-Python literal audit of the independent center-leaf message formula."""

from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (
    deltas03,
    five_cubic_path,
    forest_poly,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "formula_cpu_independent_audit_agent_20260825.json"
)
WIDTH = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def path_poly(order: int) -> list[int]:
    if order == -1:
        return [1] + [0] * (WIDTH - 1)
    if order <= -2:
        return [0] * WIDTH
    return [
        math.comb(order - rank + 1, rank)
        if order - rank + 1 >= rank else 0
        for rank in range(WIDTH)
    ]


def add(left: list[int], right: list[int]) -> list[int]:
    return [a + b for a, b in zip(left, right)]


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * WIDTH
    for rank in range(WIDTH):
        out[rank] = sum(left[index] * right[rank - index] for index in range(rank + 1))
    return out


def shift(poly: list[int]) -> list[int]:
    return [0, *poly[:-1]]


def send(absent: list[int], present: list[int], distance: int):
    parent_absent = add(
        multiply(path_poly(distance - 1), absent),
        multiply(path_poly(distance - 2), present),
    )
    parent_present = add(
        multiply(path_poly(distance - 2), absent),
        multiply(path_poly(distance - 3), present),
    )
    return parent_absent, parent_present


def outer(link: int, low: int, high: int):
    absent = multiply(path_poly(low), path_poly(high))
    present = shift(multiply(path_poly(low - 1), path_poly(high - 1)))
    return send(absent, present, link)


def half(center_link: int, middle_leaf: int, outer_link: int, low: int, high: int):
    outer_absent, outer_present = outer(outer_link, low, high)
    middle_absent = multiply(path_poly(middle_leaf), outer_absent)
    middle_present = shift(multiply(path_poly(middle_leaf - 1), outer_present))
    return send(middle_absent, middle_present, center_link)


def formula(lengths: list[int]):
    left_absent, left_present = half(*lengths[:5])
    right_absent, right_present = half(*lengths[5:10])
    center_absent = multiply(left_absent, right_absent)
    center_present = shift(multiply(left_present, right_present))
    root_deleted, root_present = send(
        center_absent, center_present, lengths[10]
    )
    whole = add(root_deleted, shift(root_present))
    return whole, root_deleted


def main() -> None:
    source = random.Random(0xC0DE_1EAF_993)
    cases = 256
    coefficient_comparisons = 0
    delta_comparisons = 0
    for _ in range(cases):
        lengths = [source.randint(1, 8) for _ in range(11)]
        whole, deleted = formula(lengths)
        adjacency, paths = five_cubic_path(lengths[10], tuple(lengths[:10]))
        root = paths["center_pendant"][-1]
        literal_whole = forest_poly(adjacency)
        literal_deleted = forest_poly(adjacency, frozenset({root}))
        assert whole == literal_whole[:WIDTH]
        assert deleted == literal_deleted[:WIDTH]
        coefficient_comparisons += 2 * WIDTH
        assert deltas03(literal_whole, literal_deleted) == deltas03(
            [*whole, literal_whole[9]], [*deleted, literal_deleted[9]]
        )
        delta_comparisons += 4
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-leaf-"
            "formula-cpu-independent-audit-agent-v1"
        ),
        "status": (
            "PASS_PURE_PYTHON_LITERAL_CENTER_LEAF_MESSAGE_FORMULA_AUDIT"
        ),
        "random_cases": cases,
        "full_coefficient_comparisons": coefficient_comparisons,
        "delta_comparisons": delta_comparisons,
        "failures": 0,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
