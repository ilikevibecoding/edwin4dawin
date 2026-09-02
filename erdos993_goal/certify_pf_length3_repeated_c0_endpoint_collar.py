"""Exact finite collar around the c=0 repeated-root endpoint.

This uses the second-order endpoint orientations: after normalizing by the
common t and c powers, subtract the c=0 resultant quotient from A0, and
subtract the exact c=0 resultant multiple from A1 before dividing A1 by
one additional positive power of c.  On R=0 these replacements preserve
the two orientation signs for every c>0.
"""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from fractions import Fraction
from pathlib import Path

from certify_pf_length3_repeated_branch_core import (
    Cell,
    choose_axis,
    compactified,
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


def parse_fraction(value: str) -> Fraction:
    return Fraction(value)


def endpoint_corrected_polynomials(parity, sign, c_high):
    source = build(parity, return_polynomials=True, include_alternate=False)
    ambient = source["ring"]
    rr, zz, uu, vv, cc = ambient.gens
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]
    fr, target_data = compactified(resultant, sign, Fraction(0), c_high, "2c", 1024)
    fm0, _ = compactified(m0, sign, Fraction(0), c_high, "2c", 1024)
    fm1, _ = compactified(m1, sign, Fraction(0), c_high, "2c", 1024)
    t, d, u, v, C, c, q, h = target_data
    au = c * u - 4 * c - 2 * u - 1
    av = c * v - 4 * c - 2 * v - 1
    fa0 = (c + 1) ** 5 * fm0 + 128 * (2 * c - 1) * au * av * h**3 * fr
    fa1 = (
        (c + 1) ** 7 * fm1
        + 512 * (c - 2) * (2 * c - 1) * au * av * h**4 * fr
    )
    normalized = []
    orders = []
    for poly in (fr, fa0, fa1):
        poly, t_order = strip_common_axis(poly, 0)
        poly, c_order = strip_common_axis(poly, 4)
        normalized.append(poly)
        orders.append((t_order, c_order))
    assert orders == [(2, 2), (3, 2), (3, 2)]
    rpoly, a0poly, a1poly = normalized
    rface = rpoly.evaluate(4, 0)
    corrected = []
    quotient_terms = []
    face_remainder_terms = []
    for poly, divide_by_c in ((a0poly, False), (a1poly, True)):
        quotient, remainder = divmod(poly.evaluate(4, 0), rface)
        if divide_by_c:
            assert not remainder
        lifted = poly.ring.from_dict(
            {monomial + (0,): coefficient for monomial, coefficient in quotient.terms()}
        )
        replacement = poly - lifted * rpoly
        if divide_by_c:
            replacement, c_order = strip_common_axis(replacement, 4)
            assert c_order == 1
        corrected.append(replacement)
        quotient_terms.append(len(quotient.terms()))
        face_remainder_terms.append(len(remainder.terms()))
    return rpoly, corrected[0], corrected[1], orders, quotient_terms, face_remainder_terms


def cover(parity, b_sign, c_high, max_cells, max_depth, progress_every):
    started = time.monotonic()
    sign = 1 if b_sign == "positive" else -1
    rpoly, a0poly, a1poly, orders, quotient_terms, face_remainder_terms = (
        endpoint_corrected_polynomials(parity, sign, c_high)
    )
    controls = {}
    metadata = {}
    for name, poly in (("R", rpoly), ("A0", a0poly), ("A1", a1poly)):
        power, degrees, terms = integer_power_array(poly)
        controls[name] = integer_power_to_bernstein_reduced(power)
        metadata[name] = {"degrees_t_d_u_v_C": list(degrees), "term_count": terms}
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
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_C0_ENDPOINT_COLLAR" if unresolved is None else "INCOMPLETE",
        "parity": parity,
        "B_sign": b_sign,
        "coordinates": "q=t^2/1024, B=sign*c*t*d/16, c=C*c_high",
        "c_interval": ["0", str(c_high)],
        "common_orders_t_c": orders,
        "endpoint_resultant_quotient_terms": quotient_terms,
        "endpoint_face_remainder_terms": face_remainder_terms,
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
    parser.add_argument("--c-high", type=parse_fraction, default=Fraction(1, 64))
    parser.add_argument("--max-cells", type=int, default=20_000)
    parser.add_argument("--max-depth", type=int, default=220)
    parser.add_argument("--progress-every", type=int, default=250)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    assert Fraction(0) < args.c_high <= Fraction(1, 16)
    report = cover(
        args.parity,
        args.b_sign,
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
