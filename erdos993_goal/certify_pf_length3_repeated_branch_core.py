"""Exact branch-adapted cover of the c<1/2 infinite-reserve corner.

The repeated-resultant normal form uses

    q = 1/r = t^2/1024,
    B = c(c-2)+4z(c+1)^2 = sign*t*d/32.

Thus 0<t<=1 and 0<=d<=1 cover q<=1/1024 and B^2<=q.
After compactifying each source polynomial, the common t-orders are
removed.  The two orientation polynomials are replaced by the exact
resultant-equivalent combinations from the weighted normal-form proof.
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
    bounds,
    domain_strict_positive,
    elevate_tensor_to_shape,
    positive_on_constraint,
    remove_positive_content,
)
from certify_pf_length3_uniform_inner_orientation import (
    midpoint_split_exact,
)
from verify_pf_length3_repeated_resultant_reduction import build


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int, int]
    address: str
    included_sides: tuple[tuple[bool, bool], ...]


def parse_fraction(value: str) -> Fraction:
    return Fraction(value)


def compactified(
    poly,
    sign: int,
    c_low: Fraction,
    c_high: Fraction,
    d_scale: str,
    q_denominator: int,
):
    """Return q^deg_r h^deg_z P(1/q,(base+B)/h,u,v,c)."""

    target, t, d, u, v, C = ring("t,d,u,v,C", QQ)
    low = QQ(c_low.numerator, c_low.denominator)
    high = QQ(c_high.numerator, c_high.denominator)
    c = low + (high - low) * C
    square_root = math.isqrt(q_denominator)
    assert square_root * square_root == q_denominator
    q = t**2 / q_denominator
    h = 4 * (c + 1) ** 2
    base = c * (2 - c)
    if d_scale == "constant":
        scaled_d = d
    elif d_scale == "2c":
        scaled_d = 2 * c * d
    else:
        raise ValueError(d_scale)
    z_numerator = base + sign * t * scaled_d / square_root

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
    return transformed, (t, d, u, v, C, c, q, h)


def strip_common_axis(poly, axis):
    order = min(monomial[axis] for monomial, _ in poly.terms())
    if order == 0:
        return poly, order
    return poly.ring.from_dict(
        {
            monomial[:axis] + (monomial[axis] - order,) + monomial[axis + 1 :]: coefficient
            for monomial, coefficient in poly.terms()
        }
    ), order


def integer_power_array(poly):
    degrees = poly.degrees()
    output = np.zeros(tuple(degree + 1 for degree in degrees), dtype=object)
    common = math.lcm(*(int(coefficient.denominator) for _, coefficient in poly.terms()))
    for monomial, coefficient in poly.terms():
        output[monomial] = int(coefficient * common)
    return divide_common_gcd(output), degrees, len(poly.terms())


def divide_common_gcd(array):
    common = 0
    for value in array.flat:
        common = math.gcd(common, abs(int(value)))
        if common == 1:
            return array
    if common <= 1:
        return array
    reduced = np.empty_like(array)
    for index, value in enumerate(array.flat):
        reduced.flat[index] = int(value) // common
    return reduced


def integer_power_to_bernstein_reduced(array):
    """Exact power-to-Bernstein conversion, removing global scales per axis."""

    result = array
    for axis, size in enumerate(result.shape):
        degree = size - 1
        if degree == 0:
            continue
        scale = math.lcm(*(math.comb(degree, k) for k in range(degree + 1)))
        moved = np.moveaxis(result, axis, 0)
        converted = np.empty_like(moved)
        for index in range(degree + 1):
            value = np.zeros(moved.shape[1:], dtype=object)
            for power in range(index + 1):
                value += (
                    moved[power]
                    * math.comb(index, power)
                    * (scale // math.comb(degree, power))
                )
            converted[index] = value
        result = divide_common_gcd(np.moveaxis(converted, 0, axis))
    return result


def leaf_reason(controls, included):
    for sign, label in ((1, "R>0"), (-1, "R<0")):
        if domain_strict_positive(sign * controls["R"], included, exact=True):
            return label
    pairs = [("A0", "A1")]
    for prefix in ("N", "I"):
        if f"{prefix}0" in controls and f"{prefix}1" in controls:
            pairs.append((f"{prefix}0", f"{prefix}1"))
    for first, second in pairs:
        for sign, label in ((1, ">0"), (-1, "<0")):
            if all(
                domain_strict_positive(sign * controls[name], included, exact=True)
                for name in (first, second)
            ):
                return f"{first}{label}_and_{second}{label}"
            if all(
                positive_on_constraint(
                    sign * controls[name], controls[f"R_for_{name}"], exact=True
                )
                for name in (first, second)
            ):
                return f"{first}{label}_and_{second}{label}_on_R=0"
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
    c_low,
    c_high,
    max_cells,
    max_depth,
    progress_every,
    d_scale,
    q_denominator,
):
    started = time.monotonic()
    sign = 1 if b_sign == "positive" else -1
    source = build(parity, return_polynomials=True, include_alternate=False)
    ambient = source["ring"]
    rr, zz, uu, vv, cc = ambient.gens
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]

    fr, target_data = compactified(
        resultant, sign, c_low, c_high, d_scale, q_denominator
    )
    fm0, _ = compactified(m0, sign, c_low, c_high, d_scale, q_denominator)
    fm1, _ = compactified(m1, sign, c_low, c_high, d_scale, q_denominator)
    t, d, u, v, C, c, q, h = target_data
    au = c * u - 4 * c - 2 * u - 1
    av = c * v - 4 * c - 2 * v - 1

    # The reserve/z degrees give these compactified identities exactly:
    # F(r^7 R) = h^3 F(R) in the A0 normalization and
    # F(r^8 R) = h^4 F(R) in the A1 normalization.
    fa0 = (c + 1) ** 5 * fm0 + 128 * (2 * c - 1) * au * av * h**3 * fr
    fa1 = (
        (c + 1) ** 7 * fm1
        + 512 * (c - 2) * (2 * c - 1) * au * av * h**4 * fr
    )
    fr, r_order = strip_common_axis(fr, 0)
    fa0, a0_order = strip_common_axis(fa0, 0)
    fa1, a1_order = strip_common_axis(fa1, 0)
    assert r_order == 2 and a0_order == 3 and a1_order == 3
    c_orders = {"R": 0, "A0": 0, "A1": 0}
    if c_low == 0:
        fr, c_orders["R"] = strip_common_axis(fr, 4)
        fa0, c_orders["A0"] = strip_common_axis(fa0, 4)
        fa1, c_orders["A1"] = strip_common_axis(fa1, 4)

    controls = {}
    metadata = {}
    for name, poly in (("R", fr), ("A0", fa0), ("A1", fa1)):
        power, degrees, terms = integer_power_array(poly)
        controls[name] = integer_power_to_bernstein_reduced(power)
        metadata[name] = {
            "degrees_t_d_u_v_C": list(degrees),
            "term_count": terms,
            "removed_t_order": {"R": r_order, "A0": a0_order, "A1": a1_order}[name],
            "removed_C_order": c_orders[name],
        }
    for name in ("A0", "A1"):
        controls[f"R_for_{name}"] = elevate_tensor_to_shape(
            controls["R"], controls[name].shape, exact=True
        )

    included = (
        (False, True),
        (True, True),
        (True, True),
        (True, True),
        (c_low != 0, c_high != Fraction(1, 2)),
    )
    stack = [Cell(controls, (0, 0, 0, 0, 0), "", included)]
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
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_BRANCH_CORE" if unresolved is None else "INCOMPLETE",
        "parity": parity,
        "B_sign_chart": b_sign,
        "coordinates": (
            f"q=t^2/{q_denominator}, B=sign*t*d/{math.isqrt(q_denominator)}"
            if d_scale == "constant"
            else f"q=t^2/{q_denominator}, B=sign*t*(2c*d)/{math.isqrt(q_denominator)}"
        ),
        "d_scale": d_scale,
        "q_denominator": q_denominator,
        "c_interval": [str(c_low), str(c_high)],
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
    parser.add_argument("--c-low", type=parse_fraction, required=True)
    parser.add_argument("--c-high", type=parse_fraction, required=True)
    parser.add_argument("--max-cells", type=int, default=20_000)
    parser.add_argument("--max-depth", type=int, default=220)
    parser.add_argument("--progress-every", type=int, default=250)
    parser.add_argument("--d-scale", choices=("constant", "2c"), default="constant")
    parser.add_argument("--q-denominator", type=int, default=1024)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    assert Fraction(0) <= args.c_low < args.c_high <= Fraction(1, 2)
    assert math.isqrt(args.q_denominator) ** 2 == args.q_denominator
    report = cover(
        args.parity,
        args.b_sign,
        args.c_low,
        args.c_high,
        args.max_cells,
        args.max_depth,
        args.progress_every,
        args.d_scale,
        args.q_denominator,
    )
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
