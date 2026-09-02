"""Exact last-box certificate for the repeated-resultant cubic slope.

On R=0 the exact derivative identity gives

    R_c*S0 = J0*(S1+c*Delta*S0).

This script certifies the remaining factor G=S1+c*Delta*S0 is positive on
every positive resultant root in the only unresolved integer-reserve box

    r>=1, 0<z<=1, 0<=u,v<=1, 0<c<=2.
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
    elevate_tensor_to_shape,
    positive_on_constraint,
    remove_positive_content,
)
from certify_pf_length3_uniform_inner_orientation import (
    integer_power_to_bernstein,
    midpoint_split_exact,
)
from verify_pf_length3_repeated_resultant_reduction import build


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int, int]
    address: str
    included_sides: tuple[tuple[bool, bool], ...]


def restrict_half(controls, included, depth, address, axis, child):
    halves = {
        name: midpoint_split_exact(array, axis) for name, array in controls.items()
    }
    controls = {name: pair[child] for name, pair in halves.items()}
    included = list(included)
    included[axis] = (
        (included[axis][0], True)
        if child == 0
        else (True, included[axis][1])
    )
    depth = list(depth)
    depth[axis] += 1
    return controls, tuple(included), tuple(depth), address + f"{axis}{'L' if child == 0 else 'R'}"


def leaf_reason(controls, included):
    for sign, label in ((1, "R>0"), (-1, "R<0")):
        if domain_strict_positive(sign * controls["R"], included, exact=True):
            return label
    if domain_strict_positive(controls["G"], included, exact=True):
        return "G>0"
    if positive_on_constraint(controls["G"], controls["R"], exact=True):
        return "G>0_on_R=0"
    return None


def choose_axis(controls):
    target = controls["R"]
    low, high = bounds(target)
    if not (low < 0 < high):
        target = controls["G"]
    scores = []
    for axis in range(5):
        maximum = max(abs(int(value)) for value in np.diff(target, axis=axis).flat)
        scores.append(maximum.bit_length() if maximum else -1)
    return max(range(5), key=lambda axis: scores[axis])


def cover(parity, max_cells, max_depth):
    started = time.monotonic()
    source = build(parity, return_polynomials=True)
    resultant = remove_positive_content(source["resultant"])[0]
    ambient = source["ring"]
    r, z, u, v, c = ambient.gens
    p = 2 * r + (17 if parity == "odd" else 18)
    delta = (1 + 4 * z) * (p - 8) * (p - 9)
    slope = source["slope1"] + c * delta * source["slope0"]
    positive_content = 16 * (r + 4 if parity == "odd" else 2 * r + 9)
    slope = slope.exquo(positive_content)

    power = {
        "R": compact_power_array(resultant, "independent", "below_two"),
        "G": compact_power_array(slope, "independent", "below_two"),
    }
    controls = {name: integer_power_to_bernstein(array) for name, array in power.items()}
    target_shape = tuple(max(controls[name].shape[i] for name in controls) for i in range(5))
    controls = {
        name: elevate_tensor_to_shape(array, target_shape, exact=True)
        for name, array in controls.items()
    }
    included = ((True, False), (False, False), (True, True), (True, True), (True, False))
    depth = (0, 0, 0, 0, 0)
    address = ""
    # r=R/(1-R)>=1 and z=Z/(1-Z)<=1.
    controls, included, depth, address = restrict_half(
        controls, included, depth, address, 0, 1
    )
    controls, included, depth, address = restrict_half(
        controls, included, depth, address, 1, 0
    )

    stack = [Cell(controls, depth, address, included)]
    reasons = Counter()
    processed = 0
    deepest = list(depth)
    unresolved = None
    while stack:
        cell = stack.pop()
        processed += 1
        if processed % 1000 == 0:
            print(
                json.dumps(
                    {
                        "checkpoint": processed,
                        "queued": len(stack),
                        "leaves": sum(reasons.values()),
                        "deepest": deepest,
                        "elapsed": round(time.monotonic() - started, 2),
                    }
                ),
                flush=True,
            )
        if processed > max_cells:
            unresolved = {"reason": "max_cells", "address": cell.address, "depth": cell.depth}
            break
        reason = leaf_reason(cell.controls, cell.included_sides)
        if reason:
            reasons[reason] += 1
            continue
        if sum(cell.depth) >= max_depth:
            unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
            break
        axis = choose_axis(cell.controls)
        children = [dict(), dict()]
        for name, array in cell.controls.items():
            children[0][name], children[1][name] = midpoint_split_exact(array, axis)
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        left_sides, right_sides = list(cell.included_sides), list(cell.included_sides)
        left_sides[axis] = (cell.included_sides[axis][0], True)
        right_sides[axis] = (True, cell.included_sides[axis][1])
        stack.append(Cell(children[0], tuple(next_depth), cell.address + f"{axis}L", tuple(left_sides)))
        stack.append(Cell(children[1], tuple(next_depth), cell.address + f"{axis}R", tuple(right_sides)))

    return {
        "status": "PASS_EXACT_REPEATED_CUBIC_SLOPE" if unresolved is None else "INCOMPLETE",
        "parity": parity,
        "domain": "integer r>=1, 0<z<=1, 0<=u,v<=1, 0<c<=2",
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
    parser.add_argument("--max-cells", type=int, default=100_000)
    parser.add_argument("--max-depth", type=int, default=160)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = cover(args.parity, args.max_cells, args.max_depth)
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
