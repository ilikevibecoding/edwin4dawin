"""Exact four-dimensional certificate on the c=0 projective face.

In q=t^2/1024, B=sign*c*t*d/16 coordinates, remove the common t and
c orders.  The first A1 face is a multiple of R; subtract it and divide
by c.  This script certifies that A0 and the next A1 coefficient have the
same strict sign on R=0 for all t,d,u,v in [0,1].
"""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path

import numpy as np

from certify_pf_length3_repeated_branch_core import (
    compactified,
    integer_power_array,
    integer_power_to_bernstein_reduced,
    strip_common_axis,
)
from certify_pf_length3_repeated_positive_root_orientation import (
    bounds,
    domain_strict_positive,
    elevate_tensor_to_shape,
    positive_on_constraint,
    remove_positive_content,
)
from certify_pf_length3_uniform_inner_orientation import midpoint_split_exact
from verify_pf_length3_repeated_resultant_reduction import build


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int]
    address: str


INCLUDED = ((True, True),) * 4


def endpoint_polynomials(parity, sign):
    source = build(parity, return_polynomials=True, include_alternate=False)
    ambient = source["ring"]
    rr, zz, uu, vv, cc = ambient.gens
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]
    fr, target_data = compactified(
        resultant, sign, Fraction(0), Fraction(1, 16), "2c", 1024
    )
    fm0, _ = compactified(m0, sign, Fraction(0), Fraction(1, 16), "2c", 1024)
    fm1, _ = compactified(m1, sign, Fraction(0), Fraction(1, 16), "2c", 1024)
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
    a0face = a0poly.evaluate(4, 0)
    a1face = a1poly.evaluate(4, 0)
    quotient, remainder = divmod(a1face, rface)
    assert not remainder
    lifted = a1poly.ring.from_dict(
        {monomial + (0,): coefficient for monomial, coefficient in quotient.terms()}
    )
    a1next = a1poly - lifted * rpoly
    a1next, next_order = strip_common_axis(a1next, 4)
    assert next_order == 1
    return rface, a0face, a1next.evaluate(4, 0), orders, len(quotient.terms())


def leaf_reason(controls):
    for sign, label in ((1, "R>0"), (-1, "R<0")):
        if domain_strict_positive(sign * controls["R"], INCLUDED, exact=True):
            return label
    for sign, label in ((1, ">0"), (-1, "<0")):
        if all(
            domain_strict_positive(sign * controls[name], INCLUDED, exact=True)
            for name in ("E0", "E1")
        ):
            return f"E0{label}_and_E1{label}"
        if all(
            positive_on_constraint(
                sign * controls[name], controls[f"R_for_{name}"], exact=True
            )
            for name in ("E0", "E1")
        ):
            return f"E0{label}_and_E1{label}_on_R=0"
    return None


def choose_axis(controls, depth):
    target = controls["R"]
    low, high = bounds(target)
    if not (low < 0 < high):
        candidates = []
        for name in ("E0", "E1"):
            low, high = bounds(controls[name])
            if low < 0 < high:
                candidates.append((min(-low, high) / max(-low, high), controls[name]))
        if candidates:
            target = max(candidates, key=lambda item: item[0])[1]
    scores = []
    for axis in range(4):
        variation = max(abs(int(value)) for value in np.diff(target, axis=axis).flat)
        scores.append((variation.bit_length() if variation else -1) - depth[axis])
    return max(range(4), key=lambda axis: scores[axis])


def cover(parity, b_sign, max_cells, max_depth):
    started = time.monotonic()
    sign = 1 if b_sign == "positive" else -1
    rface, e0face, e1face, orders, quotient_terms = endpoint_polynomials(parity, sign)
    controls = {}
    metadata = {}
    for name, poly in (("R", rface), ("E0", e0face), ("E1", e1face)):
        power, degrees, terms = integer_power_array(poly)
        controls[name] = integer_power_to_bernstein_reduced(power)
        metadata[name] = {"degrees_t_d_u_v": list(degrees), "term_count": terms}
    for name in ("E0", "E1"):
        controls[f"R_for_{name}"] = elevate_tensor_to_shape(
            controls["R"], controls[name].shape, exact=True
        )
    stack = [Cell(controls, (0, 0, 0, 0), "")]
    reasons = Counter()
    processed = 0
    deepest = [0] * 4
    unresolved = None
    while stack:
        cell = stack.pop()
        processed += 1
        if processed > max_cells:
            unresolved = {"reason": "max_cells", "address": cell.address, "depth": cell.depth}
            break
        reason = leaf_reason(cell.controls)
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
        stack.append(Cell(children[0], tuple(next_depth), cell.address + f"{axis}L"))
        stack.append(Cell(children[1], tuple(next_depth), cell.address + f"{axis}R"))
    return {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_C0_ENDPOINT_FACE" if unresolved is None else "INCOMPLETE",
        "parity": parity,
        "B_sign": b_sign,
        "coordinates": "q=t^2/1024, B=sign*c*t*d/16; c=0 projective face",
        "common_orders_t_c": orders,
        "A1_face_resultant_quotient_terms": quotient_terms,
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
    parser.add_argument("--max-depth", type=int, default=200)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = cover(args.parity, args.b_sign, args.max_cells, args.max_depth)
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
