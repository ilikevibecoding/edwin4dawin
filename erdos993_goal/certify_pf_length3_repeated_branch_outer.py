"""Exact resultant-positive covers outside the c<1/2 collision band.

For q<=1/1024 and |B|/sqrt(q)>=2c, split at |B|=c/16:

* ratio chart: B=sign*c*s/16, q=s^2*p/1024;
* large chart: q=Q/1024 and |B| interpolates from c/16 to its
  physical endpoint.

Together these charts cover the complement of the branch-core chart
|B|/sqrt(q)<=2c.  Only the repeated-root resultant needs a sign.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path

import numpy as np
from sympy import QQ
from sympy.polys.rings import ring

from certify_pf_length3_repeated_positive_root_orientation import (
    domain_strict_positive,
    remove_positive_content,
)
from certify_pf_length3_repeated_branch_core import strip_common_axis
from certify_pf_length3_uniform_inner_orientation import (
    integer_power_to_bernstein,
    midpoint_split_exact,
)
from verify_pf_length3_repeated_resultant_reduction import build


@dataclass
class Cell:
    control: np.ndarray
    depth: tuple[int, int, int, int, int]
    address: str
    included_sides: tuple[tuple[bool, bool], ...]


def parse_fraction(value: str) -> Fraction:
    return Fraction(value)


def compactified_resultant(poly, b_sign, chart, c_low, c_high):
    target, x, y, u, v, C = ring("x,y,u,v,C", QQ)
    low = QQ(c_low.numerator, c_low.denominator)
    high = QQ(c_high.numerator, c_high.denominator)
    c = low + (high - low) * C
    h = 4 * (c + 1) ** 2
    base = c * (2 - c)
    sign = 1 if b_sign == "positive" else -1
    if chart == "ratio":
        magnitude = c * x / 16
        q = x**2 * y / 1024
    elif chart == "large":
        q = x / 1024
        endpoint = h - base if b_sign == "positive" else base
        magnitude = c / 16 + y * (endpoint - c / 16)
    else:
        raise ValueError(chart)
    z_numerator = base + sign * magnitude

    reserve_degree = poly.degree(0)
    z_degree = poly.degree(1)
    q_powers = [q**power for power in range(reserve_degree + 1)]
    z_blocks = [
        z_numerator**power * h ** (z_degree - power)
        for power in range(z_degree + 1)
    ]
    u_powers = [u**power for power in range(poly.degree(2) + 1)]
    v_powers = [v**power for power in range(poly.degree(3) + 1)]
    c_powers = [c**power for power in range(poly.degree(4) + 1)]
    transformed = target.zero
    for monomial, coefficient in poly.terms():
        rp, zp, up, vp, cp = monomial
        transformed += (
            coefficient
            * q_powers[reserve_degree - rp]
            * z_blocks[zp]
            * u_powers[up]
            * v_powers[vp]
            * c_powers[cp]
        )
    transformed, common_x = strip_common_axis(transformed, 0)
    common_c = 0
    if c_low == 0:
        transformed, common_c = strip_common_axis(transformed, 4)
    return transformed, common_x, common_c


def integer_power_array(poly):
    degrees = poly.degrees()
    output = np.zeros(tuple(degree + 1 for degree in degrees), dtype=object)
    common = math.lcm(*(int(coefficient.denominator) for _, coefficient in poly.terms()))
    for monomial, coefficient in poly.terms():
        output[monomial] = int(coefficient * common)
    return output, degrees, len(poly.terms())


def choose_axis(control, depth):
    scores = []
    for axis in range(5):
        variation = max(abs(int(value)) for value in np.diff(control, axis=axis).flat)
        scores.append((variation.bit_length() if variation else -1) - depth[axis])
    return max(range(5), key=lambda axis: scores[axis])


def cover(parity, b_sign, chart, c_low, c_high, max_cells, max_depth, progress_every):
    started = time.monotonic()
    source = build(parity, return_polynomials=True, include_alternate=False)
    resultant = remove_positive_content(source["resultant"])[0]
    transformed, removed_x_order, removed_C_order = compactified_resultant(
        resultant, b_sign, chart, c_low, c_high
    )
    power, degrees, terms = integer_power_array(transformed)
    control = integer_power_to_bernstein(power)

    if chart == "ratio":
        # x=0 or y=0 imply q=0, the excluded infinite-reserve face.
        included = (
            (False, True),
            (False, True),
            (True, True),
            (True, True),
            (c_low != 0, True),
        )
    else:
        # x=q*1024, while negative-large y=1 is z=0.
        included = (
            (False, True),
            (True, b_sign == "positive"),
            (True, True),
            (True, True),
            (c_low != 0, True),
        )
    stack = [Cell(control, (0, 0, 0, 0, 0), "", included)]
    reasons = Counter()
    processed = 0
    deepest = [0] * 5
    unresolved = None
    while stack:
        cell = stack.pop()
        processed += 1
        if progress_every and processed % progress_every == 0:
            print(
                json.dumps(
                    {
                        "processed": processed,
                        "stack": len(stack),
                        "leaves": sum(reasons.values()),
                        "deepest": deepest,
                        "elapsed_seconds": round(time.monotonic() - started, 3),
                    }
                ),
                flush=True,
            )
        if processed > max_cells:
            unresolved = {"reason": "max_cells", "address": cell.address, "depth": cell.depth}
            break
        reason = None
        for sign, label in ((1, "R>0"), (-1, "R<0")):
            if domain_strict_positive(sign * cell.control, cell.included_sides, exact=True):
                reason = label
                break
        if reason:
            reasons[reason] += 1
            continue
        if sum(cell.depth) >= max_depth:
            unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
            break
        axis = choose_axis(cell.control, cell.depth)
        left, right = midpoint_split_exact(cell.control, axis)
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        left_sides, right_sides = list(cell.included_sides), list(cell.included_sides)
        left_sides[axis] = (cell.included_sides[axis][0], True)
        right_sides[axis] = (True, cell.included_sides[axis][1])
        stack.append(Cell(left, tuple(next_depth), cell.address + f"{axis}L", tuple(left_sides)))
        stack.append(Cell(right, tuple(next_depth), cell.address + f"{axis}R", tuple(right_sides)))

    return {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_BRANCH_OUTER" if unresolved is None else "INCOMPLETE",
        "parity": parity,
        "B_sign_chart": b_sign,
        "outer_chart": chart,
        "coordinates": (
            "B=sign*c*x/16, q=x^2*y/1024"
            if chart == "ratio"
            else "q=x/1024, |B|=c/16+y*(physical_endpoint-c/16)"
        ),
        "c_interval": [str(c_low), str(c_high)],
        "processed_cells": processed,
        "certified_leaves": sum(reasons.values()),
        "leaf_reasons": dict(reasons),
        "deepest": deepest,
        "polynomial_metadata": {
            "degrees_x_y_u_v_C": list(degrees),
            "term_count": terms,
            "removed_x_order": removed_x_order,
            "removed_C_order": removed_C_order,
        },
        "unresolved": unresolved,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), required=True)
    parser.add_argument("--b-sign", choices=("positive", "negative"), required=True)
    parser.add_argument("--chart", choices=("ratio", "large"), required=True)
    parser.add_argument("--c-low", type=parse_fraction, required=True)
    parser.add_argument("--c-high", type=parse_fraction, required=True)
    parser.add_argument("--max-cells", type=int, default=20_000)
    parser.add_argument("--max-depth", type=int, default=220)
    parser.add_argument("--progress-every", type=int, default=250)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    assert Fraction(0) <= args.c_low < args.c_high <= Fraction(1, 2)
    report = cover(
        args.parity,
        args.b_sign,
        args.chart,
        args.c_low,
        args.c_high,
        args.max_cells,
        args.max_depth,
        args.progress_every,
    )
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
