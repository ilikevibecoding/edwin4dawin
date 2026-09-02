"""Exact outer-ratio covers around the c=1/2 infinite-reserve transition.

Two projective charts cover the complement of the enlarged transition core:

* c-ratio: q=(c-1/2)P/16, so (c-1/2)/q>=16;
* B-ratio: q=(-B)P/8, so -B/q>=8.

The B-ratio chart is R-positive in one exact leaf.  The c-ratio chart uses an
adaptive R-positive cover; its only seam is already covered by the overlap of
the transition core and B-ratio chart.
"""

from __future__ import annotations

import json
import math
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from sympy import QQ
from sympy.polys.rings import ring

from certify_pf_length3_repeated_positive_root_orientation import (
    bounds,
    domain_strict_positive,
    remove_positive_content,
)
from certify_pf_length3_uniform_inner_orientation import (
    integer_power_to_bernstein,
    midpoint_split_exact,
)
from verify_pf_length3_repeated_resultant_reduction import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_repeated_transition_outer_exact_20260807.json"


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int, int]
    address: str
    included: tuple[tuple[bool, bool], ...]


def to_power_array(poly):
    degrees = poly.degrees()
    output = np.zeros(tuple(degree + 1 for degree in degrees), dtype=object)
    common = math.lcm(*(int(coefficient.denominator) for _, coefficient in poly.terms()))
    for monomial, coefficient in poly.terms():
        output[monomial] = int(coefficient * common)
    return output


def transformed(parity, mode):
    source = build(parity, return_polynomials=True)
    resultant = remove_positive_content(source["resultant"])[0]
    target, P, b, u, v, C = ring("P,b,u,v,C", QQ)
    c = (1 + 3 * C) / 2
    base = c * (2 - c)
    h = 4 * (c + 1) ** 2
    z_numerator = base * (1 - b)
    if mode == "c_ratio":
        q = (c - QQ(1, 2)) * P / 16
    else:
        q = b * base * P / 8
    reserve_degree = resultant.degree(0)
    z_degree = resultant.degree(1)
    result = target.zero
    for monomial, coefficient in resultant.terms():
        rp, zp, up, vp, cp = monomial
        result += (
            coefficient
            * q ** (reserve_degree - rp)
            * z_numerator**zp
            * h ** (z_degree - zp)
            * u**up
            * v**vp
            * c**cp
        )
    removed_b_power = 0
    if mode == "B_ratio":
        removed_b_power = min(monomial[1] for monomial, _ in result.terms())
        assert removed_b_power > 0
        result = result.exquo(b**removed_b_power)
    controls = {"R": integer_power_to_bernstein(to_power_array(result))}
    if mode == "c_ratio":
        union_p = P - QQ(1, 2)
        union_q = QQ(1, 1024) - q
        controls["union_P"] = integer_power_to_bernstein(to_power_array(union_p))
        controls["union_q"] = integer_power_to_bernstein(to_power_array(union_q))
    return controls, result.degrees(), len(result.terms()), removed_b_power


def double_transformed(parity, c_part):
    """Chart L>=16 and D<=8 with both ratios explicit."""

    source = build(parity, return_polynomials=True)
    resultant = remove_positive_content(source["resultant"])[0]
    target, P, Y, u, v, C = ring("P,Y,u,v,C", QQ)
    c = (1 + C) / 2 if c_part == "low" else 1 + C
    base = c * (2 - c)
    h = 4 * (c + 1) ** 2
    q = (c - QQ(1, 2)) * P / 16
    b_signed = -8 * q * Y
    z_numerator = base + b_signed
    reserve_degree = resultant.degree(0)
    z_degree = resultant.degree(1)
    result = target.zero
    for monomial, coefficient in resultant.terms():
        rp, zp, up, vp, cp = monomial
        result += (
            coefficient
            * q ** (reserve_degree - rp)
            * z_numerator**zp
            * h ** (z_degree - zp)
            * u**up
            * v**vp
            * c**cp
        )
    removed = {}
    for axis, variable, label in ((0, P, "P"), (4, C, "C")):
        power = min(monomial[axis] for monomial, _ in result.terms())
        if power:
            result = result.exquo(variable**power)
            removed[label] = power
    controls = integer_power_to_bernstein(to_power_array(result))
    included = (
        (False, True),
        (True, True),
        (True, True),
        (True, True),
        (False, True) if c_part == "low" else (True, False),
    )
    assert domain_strict_positive(controls, included, exact=True)
    return {
        "parity": parity,
        "mode": f"double_ratio_{c_part}",
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_TRANSITION_OUTER",
        "R_positive_leaves": 1,
        "degrees": list(result.degrees()),
        "term_count": len(result.terms()),
        "removed_positive_boundary_powers": removed,
    }


def cover(parity, mode, max_cells=100_000, max_depth=180):
    started = time.monotonic()
    controls, degrees, terms, removed_b_power = transformed(parity, mode)
    included = (
        (False, True),
        (False if mode == "B_ratio" else True, True),
        (True, True),
        (True, True),
        (False, False),
    )
    stack = [Cell(controls, (0, 0, 0, 0, 0), "", included)]
    processed = leaves = seam_leaves = 0
    deepest = [0] * 5
    unresolved = None
    while stack:
        cell = stack.pop()
        processed += 1
        if domain_strict_positive(cell.controls["R"], cell.included, exact=True):
            leaves += 1
            continue
        if mode == "c_ratio" and all(
            min(int(value) for value in cell.controls[name].flat) >= 0
            for name in ("union_P", "union_q")
        ):
            # P>=1/2 means L=16/P<=32.  At q<=1/1024, every D is covered
            # either by the core D<=16 or by the B-outer D>=8 chart.
            seam_leaves += 1
            continue
        if processed > max_cells:
            unresolved = {"reason": "max_cells", "address": cell.address, "depth": cell.depth}
            break
        if sum(cell.depth) >= max_depth:
            unresolved = {
                "reason": "max_depth",
                "address": cell.address,
                "depth": cell.depth,
                "R_bounds": [str(value) for value in bounds(cell.controls["R"])],
            }
            break
        target = cell.controls["R"]
        scores = []
        for axis in range(5):
            variation = max(abs(int(value)) for value in np.diff(target, axis=axis).flat)
            scores.append((variation.bit_length() if variation else -1) - cell.depth[axis])
        axis = max(range(5), key=lambda item: scores[item])
        children = [dict(), dict()]
        for name, array in cell.controls.items():
            children[0][name], children[1][name] = midpoint_split_exact(array, axis)
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        left, right = list(cell.included), list(cell.included)
        left[axis] = (cell.included[axis][0], True)
        right[axis] = (True, cell.included[axis][1])
        stack.append(Cell(children[0], tuple(next_depth), cell.address + f"{axis}L", tuple(left)))
        stack.append(Cell(children[1], tuple(next_depth), cell.address + f"{axis}R", tuple(right)))
    return {
        "parity": parity,
        "mode": mode,
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_TRANSITION_OUTER" if unresolved is None else "INCOMPLETE",
        "processed_cells": processed,
        "R_positive_leaves": leaves,
        "covered_overlap_seam_leaves": seam_leaves,
        "deepest": deepest,
        "degrees": list(degrees),
        "term_count": terms,
        "removed_positive_b_power": removed_b_power,
        "unresolved": unresolved,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def main():
    records = []
    for parity in ("odd", "even"):
        records.extend(
            (
                double_transformed(parity, "low"),
                double_transformed(parity, "high"),
                cover(parity, "B_ratio"),
            )
        )
    complete = all(
        record["status"] == "PASS_EXACT_PF_LENGTH3_REPEATED_TRANSITION_OUTER"
        for record in records
    )
    report = {
        "status": (
            "PASS_EXACT_PF_LENGTH3_REPEATED_TRANSITION_OUTER_ATLAS"
            if complete
            else "INCOMPLETE"
        ),
        "records": records,
        "covering_statement": (
            "Together with the core L<=32,D<=16,q<=1/1024, the double-ratio "
            "L>=16,D<=8 and B-ratio D>=8 charts cover the complete c>1/2, "
            "B<=0 infinite-reserve transition neighborhood."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(OUTPUT)


if __name__ == "__main__":
    main()
