"""Exact exclusion of the affine-slope degeneracy in the length-three reduction.

For a finite Riccati coordinate the first collision row is

    q0(T) = P0 + S0*T.

Thus a genuine collision with S0=0 would require P0=S0=0.  This verifier
covers a requested compact chart by exact tensor-Bernstein subdivision; a
leaf is certified as soon as either P0 or S0 has a strict sign.  A completed
cover therefore excludes the simultaneous zero without dividing by S0.
"""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from certify_pf_length3_repeated_positive_root_orientation import (
    bounds,
    compact_power_array,
    domain_strict_positive,
)
from certify_pf_length3_uniform_inner_orientation import (
    floating_power_to_bernstein,
    integer_power_to_bernstein,
    midpoint_split_exact,
    midpoint_split_float,
)
from verify_pf_length3_repeated_resultant_reduction import build


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int, int]
    address: str
    included_sides: tuple[tuple[bool, bool], ...]


def strict_sign(array, included_sides, *, exact):
    for sign, label in ((1, ">0"), (-1, "<0")):
        if domain_strict_positive(sign * array, included_sides, exact=exact):
            return label
    return None


def choose_axis(controls, depth):
    """Split the coordinate with the largest scale-adjusted variation."""

    candidates = []
    for name in ("P0", "S0"):
        low, high = bounds(controls[name])
        if low <= 0 <= high:
            candidates.append(controls[name])
    targets = candidates or list(controls.values())
    scores = []
    for axis in range(5):
        score = -1.0
        for target in targets:
            variation = max(abs(float(value)) for value in np.diff(target, axis=axis).flat)
            score = max(score, variation / 2 ** depth[axis])
        scores.append(score)
    return max(range(5), key=lambda axis: scores[axis])


def cover(
    parity,
    region,
    c_chart,
    max_cells,
    max_depth,
    numeric,
    first_half="all",
    second_half="all",
    fifth_half="all",
):
    started = time.monotonic()
    source = build(parity, return_polynomials=True)
    power = {
        "P0": compact_power_array(source["constant0"], region, c_chart),
        "S0": compact_power_array(source["slope0"], region, c_chart),
    }
    converter = floating_power_to_bernstein if numeric else integer_power_to_bernstein
    controls = {name: converter(array) for name, array in power.items()}
    splitter = midpoint_split_float if numeric else midpoint_split_exact

    included = (
        (False, False)
        if region in ("r_ge_z", "r_ge_z_product", "r_ge_z_inverse_product")
        else (True, False),
        (True, False) if region in ("r_ge_z", "r_ge_z_product") else (False, False),
        (True, True),
        (True, True),
        (False, False) if c_chart == "standard" else (True, False),
    )
    depth = (0, 0, 0, 0, 0)
    address = ""
    for axis, half in ((0, first_half), (1, second_half), (4, fifth_half)):
        if half == "all":
            continue
        pairs = {name: splitter(array, axis) for name, array in controls.items()}
        child = 0 if half == "lower" else 1
        controls = {name: pair[child] for name, pair in pairs.items()}
        address += f"{axis}{'L' if child == 0 else 'R'}"
        next_depth = list(depth)
        next_depth[axis] += 1
        depth = tuple(next_depth)
        next_included = list(included)
        next_included[axis] = (
            (included[axis][0], True) if child == 0 else (True, included[axis][1])
        )
        included = tuple(next_included)

    stack = [Cell(controls, depth, address, included)]
    reasons = Counter()
    processed = 0
    deepest = list(depth)
    unresolved = None
    while stack:
        cell = stack.pop()
        processed += 1
        if processed > max_cells:
            unresolved = {"reason": "max_cells", "address": cell.address, "depth": cell.depth}
            break
        reason = None
        for name in ("P0", "S0"):
            sign = strict_sign(cell.controls[name], cell.included_sides, exact=not numeric)
            if sign:
                reason = f"{name}{sign}"
                break
        if reason:
            reasons[reason] += 1
            continue
        if sum(cell.depth) >= max_depth:
            unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
            if numeric:
                unresolved["bounds"] = {
                    name: [float(value) for value in bounds(array)]
                    for name, array in cell.controls.items()
                }
            break
        axis = choose_axis(cell.controls, cell.depth)
        children = [dict(), dict()]
        for name, array in cell.controls.items():
            children[0][name], children[1][name] = splitter(array, axis)
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        left_sides, right_sides = list(cell.included_sides), list(cell.included_sides)
        left_sides[axis] = (cell.included_sides[axis][0], True)
        right_sides[axis] = (True, cell.included_sides[axis][1])
        stack.append(Cell(children[0], tuple(next_depth), cell.address + f"{axis}L", tuple(left_sides)))
        stack.append(Cell(children[1], tuple(next_depth), cell.address + f"{axis}R", tuple(right_sides)))

    return {
        "status": (
            "PASS_EXACT_PF_LENGTH3_REPEATED_SLOPE_DEGENERACY_EXCLUSION"
            if unresolved is None and not numeric
            else "PASS_NUMERIC_ROUTE_PROBE"
            if unresolved is None
            else "INCOMPLETE"
        ),
        "parity": parity,
        "region": region,
        "c_chart": c_chart,
        "halves": {"first": first_half, "second": second_half, "fifth": fifth_half},
        "arithmetic": "floating route probe" if numeric else "exact integer Bernstein",
        "processed_cells": processed,
        "certified_leaves": sum(reasons.values()),
        "leaf_reasons": dict(reasons),
        "deepest": deepest,
        "unresolved": unresolved,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), required=True)
    parser.add_argument(
        "--region",
        choices=(
            "r_ge_z",
            "z_minus_r",
            "independent",
            "r_ge_z_product",
            "r_ge_z_inverse_product",
        ),
        required=True,
    )
    parser.add_argument("--c-chart", choices=("standard", "below_two", "above_two"), default="standard")
    parser.add_argument("--first-half", choices=("all", "lower", "upper"), default="all")
    parser.add_argument("--second-half", choices=("all", "lower", "upper"), default="all")
    parser.add_argument("--fifth-half", choices=("all", "lower", "upper"), default="all")
    parser.add_argument("--max-cells", type=int, default=100_000)
    parser.add_argument("--max-depth", type=int, default=120)
    parser.add_argument("--numeric-probe", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = cover(
        args.parity,
        args.region,
        args.c_chart,
        args.max_cells,
        args.max_depth,
        args.numeric_probe,
        args.first_half,
        args.second_half,
        args.fifth_half,
    )
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
