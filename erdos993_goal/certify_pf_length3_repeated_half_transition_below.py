"""Exact branch-core cover approaching c=1/2 from below.

Coordinates

    c = 1/2-s^2/16,
    q = t^2/1024,
    B = sign*t*s*d/64

cover 7/16<=c<1/2 and |B|/sqrt(q)<=s/2.  The asymptotic
resultant branch lies strictly inside this band.
"""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from pathlib import Path

from sympy import QQ
from sympy.polys.rings import ring

from certify_pf_length3_repeated_branch_core import (
    Cell,
    choose_axis,
    integer_power_array,
    integer_power_to_bernstein_reduced,
    leaf_reason,
    strip_common_axis,
)
from certify_pf_length3_repeated_positive_root_orientation import (
    elevate_tensor_to_shape,
    remove_positive_content,
)
from certify_pf_length3_uniform_inner_orientation import midpoint_split_exact
from verify_pf_length3_repeated_resultant_reduction import build


def compactified(poly, sign):
    target, t, d, u, v, s = ring("t,d,u,v,s", QQ)
    c = QQ(1, 2) - s**2 / 16
    q = t**2 / 1024
    h = 4 * (c + 1) ** 2
    base = c * (2 - c)
    z_numerator = base + sign * t * s * d / 64
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
    return transformed, (t, d, u, v, s, c, h)


def cover(parity, b_sign, max_cells, max_depth, progress_every):
    started = time.monotonic()
    sign = 1 if b_sign == "positive" else -1
    source = build(parity, return_polynomials=True, include_alternate=False)
    ambient = source["ring"]
    rr, zz, uu, vv, cc = ambient.gens
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]
    fr, target_data = compactified(resultant, sign)
    fm0, _ = compactified(m0, sign)
    fm1, _ = compactified(m1, sign)
    t, d, u, v, s, c, h = target_data
    au = c * u - 4 * c - 2 * u - 1
    av = c * v - 4 * c - 2 * v - 1
    fa0 = (c + 1) ** 5 * fm0 + 128 * (2 * c - 1) * au * av * h**3 * fr
    fa1 = (
        (c + 1) ** 7 * fm1
        + 512 * (c - 2) * (2 * c - 1) * au * av * h**4 * fr
    )
    polynomials = []
    orders = []
    for poly in (fr, fa0, fa1):
        poly, order = strip_common_axis(poly, 0)
        polynomials.append(poly)
        orders.append(order)
    assert orders == [2, 3, 3]
    controls = {}
    metadata = {}
    for name, poly in zip(("R", "A0", "A1"), polynomials):
        power, degrees, terms = integer_power_array(poly)
        controls[name] = integer_power_to_bernstein_reduced(power)
        metadata[name] = {"degrees_t_d_u_v_s": list(degrees), "term_count": terms}
    for name in ("A0", "A1"):
        controls[f"R_for_{name}"] = elevate_tensor_to_shape(
            controls["R"], controls[name].shape, exact=True
        )

    included = ((False, True), (True, True), (True, True), (True, True), (False, True))
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
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_HALF_TRANSITION_BELOW" if unresolved is None else "INCOMPLETE",
        "parity": parity,
        "B_sign": b_sign,
        "coordinates": "c=1/2-s^2/16, q=t^2/1024, B=sign*t*s*d/64",
        "c_interval": ["7/16", "1/2"],
        "removed_t_orders": orders,
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
    parser.add_argument("--max-cells", type=int, default=20_000)
    parser.add_argument("--max-depth", type=int, default=220)
    parser.add_argument("--progress-every", type=int, default=250)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = cover(
        args.parity,
        args.b_sign,
        args.max_cells,
        args.max_depth,
        args.progress_every,
    )
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
