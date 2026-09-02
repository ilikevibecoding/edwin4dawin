"""Exact Bernstein cover in the infinite-reserve repeated-resultant blow-up.

Coordinates:

    q=1/r,
    z0=c(2-c)/(4(c+1)^2),
    B>=0: z=z0+b(1-z0),
    B<=0: z=z0(1-b).

The signed charts cover 0<z<=1 for 0<c<2 and resolve the joint q=B=0
face.  The two orientation polynomials are replaced by explicit
resultant-equivalent forms whose weighted initial terms orient the two
asymptotic branches.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from sympy import QQ
from sympy.polys.rings import ring

from certify_pf_length3_repeated_positive_root_orientation import (
    bounds,
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


def blowup_power_array(poly, b_sign, c_range, q_away=False):
    """Power array in (q,b,u,v,C), with positive denominators cleared."""

    assert b_sign in ("positive", "negative")
    assert c_range in ("below_half", "above_half")
    target, q, b, u, v, C = ring("q,b,u,v,C", QQ)
    c = C / 2 if c_range == "below_half" else (1 + 3 * C) / 2
    h = 4 * (c + 1) ** 2
    base = c * (2 - c)
    if b_sign == "positive":
        # H*z = base+b*(H-base), mapping z0<=z<=1.
        z_numerator = base + b * (h - base)
    else:
        # H*z = base*(1-b), mapping 0<=z<=z0.
        z_numerator = base * (1 - b)

    reserve_degree = poly.degree(0)
    z_degree = poly.degree(1)
    u_degree = poly.degree(2)
    v_degree = poly.degree(3)
    c_degree = poly.degree(4)
    q_actual = (1 + 1023 * q) / 1024 if q_away else q
    q_powers = [q_actual**power for power in range(reserve_degree + 1)]
    z_blocks = [z_numerator**power * h ** (z_degree - power) for power in range(z_degree + 1)]
    u_powers = [u**power for power in range(u_degree + 1)]
    v_powers = [v**power for power in range(v_degree + 1)]
    c_powers = [c**power for power in range(c_degree + 1)]

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
    degrees = transformed.degrees()
    output = np.zeros(tuple(degree + 1 for degree in degrees), dtype=object)
    common = math.lcm(*(int(coefficient.denominator) for _, coefficient in transformed.terms()))
    for monomial, coefficient in transformed.terms():
        output[monomial] = int(coefficient * common)
    return output, degrees, len(transformed.terms())


def power_array_from_ring_poly(poly):
    degrees = poly.degrees()
    output = np.zeros(tuple(degree + 1 for degree in degrees), dtype=object)
    common = math.lcm(*(int(coefficient.denominator) for _, coefficient in poly.terms()))
    for monomial, coefficient in poly.terms():
        output[monomial] = int(coefficient * common)
    return output


def transition_core_constraints():
    """Power arrays proving that an above-half negative-B cell lies in the solved core."""

    target, q, b, u, v, C = ring("q,b,u,v,C", QQ)
    c = (1 + 3 * C) / 2
    return {
        "core_q": power_array_from_ring_poly(QQ(1, 1024) - q),
        "core_c_ratio": power_array_from_ring_poly(16 * q - (c - QQ(1, 2))),
        "core_B_ratio": power_array_from_ring_poly(8 * q - b * c * (2 - c)),
    }


def leaf_reason(controls, included):
    if "core_q" in controls and all(
        min(int(value) for value in controls[name].flat) >= 0
        for name in ("core_q", "core_c_ratio", "core_B_ratio")
    ):
        return "covered_by_transition_core"
    for sign, label in ((1, "R>0"), (-1, "R<0")):
        if domain_strict_positive(sign * controls["R"], included, exact=True):
            return label
    for sign, label in ((1, ">0"), (-1, "<0")):
        if all(
            domain_strict_positive(sign * controls[name], included, exact=True)
            for name in ("A0", "A1")
        ):
            return f"A0{label}_and_A1{label}"
        if all(
            positive_on_constraint(
                sign * controls[name], controls[f"R_for_{name}"], exact=True
            )
            for name in ("A0", "A1")
        ):
            return f"A0{label}_and_A1{label}_on_R=0"
    return None


def choose_axis(controls, depth):
    target = controls["R"]
    low, high = bounds(target)
    if not (low < 0 < high):
        candidates = []
        for name in ("A0", "A1"):
            low, high = bounds(controls[name])
            if low < 0 < high:
                candidates.append((min(-low, high) / max(-low, high), controls[name]))
        if candidates:
            target = max(candidates, key=lambda item: item[0])[1]
    scores = []
    for axis in range(5):
        variation = max(abs(int(value)) for value in np.diff(target, axis=axis).flat)
        scores.append((variation.bit_length() if variation else -1) - depth[axis])
    return max(range(5), key=lambda axis: scores[axis])


def cover(
    parity,
    b_sign,
    c_range,
    max_cells,
    max_depth,
    q_half,
    r_only=False,
    raw_pivots=False,
):
    started = time.monotonic()
    source = build(parity, return_polynomials=True, include_alternate=False)
    ambient = source["ring"]
    r, z, u, v, c = ambient.gens
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]
    au = c * u - 4 * c - 2 * u - 1
    av = c * v - 4 * c - 2 * v - 1
    if raw_pivots:
        a0, a1 = m0, m1
    else:
        a0 = (c + 1) ** 5 * m0 + 128 * (2 * c - 1) * au * av * r**7 * resultant
        a1 = (
            (c + 1) ** 7 * m1
            + 512 * (c - 2) * (2 * c - 1) * au * av * r**8 * resultant
        )

    power = {}
    metadata = {}
    requested = (("R", resultant),) if r_only else (("R", resultant), ("A0", a0), ("A1", a1))
    for name, poly in requested:
        power[name], degrees, terms = blowup_power_array(
            poly, b_sign, c_range, q_away=q_half == "away_infinity"
        )
        metadata[name] = {"degrees_q_b_u_v_C": list(degrees), "term_count": terms}
    controls = {name: integer_power_to_bernstein(array) for name, array in power.items()}
    if b_sign == "negative" and c_range == "above_half":
        controls.update(
            {
                name: integer_power_to_bernstein(array)
                for name, array in transition_core_constraints().items()
            }
        )
    if not r_only:
        for name in ("A0", "A1"):
            controls[f"R_for_{name}"] = elevate_tensor_to_shape(
                controls["R"], controls[name].shape, exact=True
            )

    # q=0 is the excluded r=infinity face; q=1 (r=1) is included.
    # b=1 is z=0 only in the negative-B chart and is then excluded.
    # The c=1/2 transition is excluded from both open c ranges and certified separately.
    included = [
        (True, True) if q_half == "away_infinity" else (False, True),
        (True, b_sign == "positive"),
        (True, True),
        (True, True),
        (False, False),
    ]
    depth = [0] * 5
    address = ""
    if q_half not in ("all", "away_infinity"):
        pairs = {name: midpoint_split_exact(array, 0) for name, array in controls.items()}
        child = 0 if q_half == "lower" else 1
        controls = {name: pair[child] for name, pair in pairs.items()}
        address = f"0{'L' if child == 0 else 'R'}"
        depth[0] = 1
        included[0] = ((False, True) if child == 0 else (True, True))

    stack = [Cell(controls, tuple(depth), address, tuple(included))]
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
        if r_only:
            reason = None
            for sign, label in ((1, "R>0"), (-1, "R<0")):
                if domain_strict_positive(sign * cell.controls["R"], cell.included_sides, exact=True):
                    reason = label
                    break
        else:
            reason = leaf_reason(cell.controls, cell.included_sides)
        if reason:
            reasons[reason] += 1
            continue
        if sum(cell.depth) >= max_depth:
            unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
            break
        axis = choose_axis(cell.controls, cell.depth)
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
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_INFINITY_BLOWUP" if unresolved is None else "INCOMPLETE",
        "parity": parity,
        "B_sign_chart": b_sign,
        "c_range": c_range,
        "q_half": q_half,
        "resultant_only": r_only,
        "raw_first_pivot_orientations": raw_pivots and not r_only,
        "processed_cells": processed,
        "certified_leaves": sum(reasons.values()),
        "leaf_reasons": dict(reasons),
        "deepest": deepest,
        "polynomial_metadata": metadata,
        "unresolved": unresolved,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), required=True)
    parser.add_argument("--b-sign", choices=("positive", "negative"), required=True)
    parser.add_argument("--c-range", choices=("below_half", "above_half"), required=True)
    parser.add_argument(
        "--q-half",
        choices=("all", "lower", "upper", "away_infinity"),
        default="lower",
        help="away_infinity maps q=(1+1023Q)/1024, i.e. 1/1024<=q<=1.",
    )
    parser.add_argument("--max-cells", type=int, default=100_000)
    parser.add_argument("--max-depth", type=int, default=180)
    parser.add_argument("--r-only", action="store_true")
    parser.add_argument(
        "--raw-pivots",
        action="store_true",
        help="Use the lower-degree original M0,M1 orientations (best away from q=0).",
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = cover(
        args.parity,
        args.b_sign,
        args.c_range,
        args.max_cells,
        args.max_depth,
        args.q_half,
        args.r_only,
        args.raw_pivots,
    )
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
