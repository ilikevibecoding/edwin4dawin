"""Exact toric branch-core atlas approaching c=1/2 from below.

Let delta=1/2-c, Q=1024q, and S=16delta.  The two charts

    delta-dominant: S=a, Q=a*b, B=sign*a*d/64,
    q-dominant:     Q=a, S=a*b, B=sign*a*d/64

cover the joint Q=S=0 corner.  The band 0<=d<=1 contains the
asymptotic branches B^2 approximately 2*q*delta.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from collections import Counter
from fractions import Fraction
from functools import lru_cache
from pathlib import Path

import numpy as np
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
from certify_pf_length3_uniform_inner_orientation import bounds, midpoint_split_exact
from exact_bernstein_navigation import navigate_controls_exact
from verify_pf_length3_repeated_resultant_reduction import build


def compactified(poly, chart, sign, resolution):
    target, a, x, y, u, v = ring("a,x,y,u,v", QQ)
    if resolution == "base":
        ratio = x
        amplitude = y
    elif resolution == "branch":
        ratio = x**2
        amplitude = x * y
    elif resolution == "outer":
        amplitude = x
        ratio = x**2 * y
    else:
        raise ValueError(resolution)
    if chart == "delta_dominant":
        c = QQ(1, 2) - a / 16
        q = a * ratio / 1024
    elif chart == "q_dominant":
        c = QQ(1, 2) - a * ratio / 16
        q = a / 1024
    else:
        raise ValueError(chart)
    h = 4 * (c + 1) ** 2
    z_numerator = c * (2 - c) + sign * a * amplitude / 64
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
    return transformed, (a, x, y, u, v, c, h)


def choose_alternate_axis(controls, depth):
    """Prefer resolving complementary/projective pivot zero sets when ambiguous."""

    candidates = []
    for name in ("N0", "N1", "I0", "I1"):
        if name in controls:
            low, high = bounds(controls[name])
            if low < 0 < high:
                candidates.append((Fraction(min(-low, high), max(-low, high)), controls[name]))
    if not candidates:
        return choose_axis(controls, depth)
    target = max(candidates, key=lambda item: item[0])[1]
    scores = []
    for axis in range(5):
        variation = max(abs(int(value)) for value in np.diff(target, axis=axis).flat)
        scores.append((variation.bit_length() if variation else -1) - depth[axis])
    return max(range(5), key=lambda axis: scores[axis])


def restrict_to_address(controls, depth, included_sides, address):
    if len(address) % 2:
        raise ValueError("initial address must be axis/side pairs")
    controls = controls
    depth = list(depth)
    included_sides = list(included_sides)
    for offset in range(0, len(address), 2):
        axis = int(address[offset])
        side = address[offset + 1]
        if axis not in range(5) or side not in "LR":
            raise ValueError(f"invalid initial-address token {address[offset:offset + 2]!r}")
        children = [dict(), dict()]
        for name, array in controls.items():
            children[0][name], children[1][name] = midpoint_split_exact(array, axis)
        lower_included, upper_included = included_sides[axis]
        if side == "L":
            controls = children[0]
            included_sides[axis] = (lower_included, True)
        else:
            controls = children[1]
            included_sides[axis] = (True, upper_included)
        depth[axis] += 1
    return controls, tuple(depth), tuple(included_sides)


def midpoint_restrict_exact(array, axis, side):
    """Exact midpoint restriction to one child, without allocating its sibling."""

    moved = np.moveaxis(array, axis, 0)
    degree = moved.shape[0] - 1
    work = moved.copy()
    selected = np.empty_like(moved)
    if side == "L":
        selected[0] = work[0] * 2**degree
        for level in range(1, degree + 1):
            work = work[:-1] + work[1:]
            selected[level] = work[0] * 2 ** (degree - level)
    elif side == "R":
        selected[degree] = work[degree] * 2**degree
        for level in range(1, degree + 1):
            work = work[:-1] + work[1:]
            selected[degree - level] = work[-1] * 2 ** (degree - level)
    else:
        raise ValueError(f"invalid restriction side {side!r}")
    return np.moveaxis(selected, 0, axis)


def restrict_to_address_consuming(controls, depth, included_sides, address):
    """Restrict one address while releasing each parent tensor immediately."""

    if len(address) % 2:
        raise ValueError("initial address must be axis/side pairs")
    tokens = []
    for offset in range(0, len(address), 2):
        axis = int(address[offset])
        side = address[offset + 1]
        if axis not in range(5) or side not in "LR":
            raise ValueError(f"invalid initial-address token {address[offset:offset + 2]!r}")
        tokens.append((axis, side))
    depth = list(depth)
    included_sides = list(included_sides)
    for axis, side in tokens:
        restricted = {}
        for name in tuple(controls):
            array = controls.pop(name)
            restricted[name] = midpoint_restrict_exact(array, axis, side)
        controls = restricted
        lower_included, upper_included = included_sides[axis]
        included_sides[axis] = (
            (lower_included, True) if side == "L" else (True, upper_included)
        )
        depth[axis] += 1
    return controls, tuple(depth), tuple(included_sides)


@lru_cache(maxsize=None)
def bernstein_to_centered_scaled_matrix(degree):
    """Matrix for 2^n p((1+s)/2) from degree-n Bernstein controls."""

    matrix = np.empty((degree + 1, degree + 1), dtype=object)
    for power in range(degree + 1):
        for index in range(degree + 1):
            coefficient = 0
            for left_power in range(max(0, power - (degree - index)), min(index, power) + 1):
                right_power = power - left_power
                coefficient += (
                    math.comb(index, left_power)
                    * math.comb(degree - index, right_power)
                    * (-1) ** right_power
                )
            matrix[power, index] = math.comb(degree, index) * coefficient
    return matrix


def centered_power_tensor(bernstein):
    result = bernstein
    for axis, size in enumerate(result.shape):
        matrix = bernstein_to_centered_scaled_matrix(size - 1)
        moved = np.moveaxis(result, axis, 0)
        flat = moved.reshape(size, -1)
        transformed = np.empty_like(flat)
        for power in range(size):
            row = np.zeros(flat.shape[1], dtype=object)
            for index in range(size):
                coefficient = matrix[power, index]
                if coefficient:
                    row += coefficient * flat[index]
            transformed[power] = row
        result = np.moveaxis(transformed.reshape(moved.shape), 0, axis)
    return result


def centered_l1_sign(bernstein):
    power = centered_power_tensor(bernstein)
    constant_index = (0,) * power.ndim
    constant = int(power[constant_index])
    radius = sum(
        abs(int(value))
        for index, value in np.ndenumerate(power)
        if index != constant_index
    )
    if constant > radius:
        return 1
    if constant < -radius:
        return -1
    return 0


def toric_leaf_reason(controls, included_sides, centered_fallback):
    reason = leaf_reason(controls, included_sides)
    if reason or not centered_fallback:
        return reason
    resultant_sign = centered_l1_sign(controls["R"])
    if resultant_sign:
        return "R>0_centered" if resultant_sign > 0 else "R<0_centered"
    pairs = [("A0", "A1")]
    for prefix in ("N", "I"):
        if f"{prefix}0" in controls and f"{prefix}1" in controls:
            pairs.append((f"{prefix}0", f"{prefix}1"))
    for first, second in pairs:
        first_sign = centered_l1_sign(controls[first])
        second_sign = centered_l1_sign(controls[second])
        if first_sign and first_sign == second_sign:
            label = ">0" if first_sign > 0 else "<0"
            return f"{first}{label}_and_{second}{label}_centered"
    return None


def cover(
    parity,
    b_sign,
    chart,
    resolution,
    max_cells,
    max_depth,
    progress_every,
    alternate_pivot,
    projective_pivot,
    initial_addresses,
    prefer_alternate_axis,
    centered_fallback,
    address_stack,
    reversible_address_stack,
):
    started = time.monotonic()
    sign = 1 if b_sign == "positive" else -1
    source = build(
        parity,
        return_polynomials=True,
        include_alternate=alternate_pivot,
        include_projective=projective_pivot,
    )
    ambient = source["ring"]
    rr, zz, uu, vv, cc = ambient.gens
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]
    fr, target_data = compactified(resultant, chart, sign, resolution)
    fm0, _ = compactified(m0, chart, sign, resolution)
    fm1, _ = compactified(m1, chart, sign, resolution)
    a, x, y, u, v, c, h = target_data
    au = c * u - 4 * c - 2 * u - 1
    av = c * v - 4 * c - 2 * v - 1
    fa0 = (c + 1) ** 5 * fm0 + 128 * (2 * c - 1) * au * av * h**3 * fr
    fa1 = (
        (c + 1) ** 7 * fm1
        + 512 * (c - 2) * (2 * c - 1) * au * av * h**4 * fr
    )
    requested = [("R", fr), ("A0", fa0), ("A1", fa1)]
    if alternate_pivot:
        n0 = remove_positive_content(source["alternate_orientation0"])[0]
        n1 = remove_positive_content(source["alternate_orientation1"])[0]
        fn0, _ = compactified(n0, chart, sign, resolution)
        fn1, _ = compactified(n1, chart, sign, resolution)
        requested.extend((("N0", fn0), ("N1", fn1)))
    if projective_pivot:
        i0 = remove_positive_content(source["projective_orientation0"])[0]
        i1 = remove_positive_content(source["projective_orientation1"])[0]
        fi0, _ = compactified(i0, chart, sign, resolution)
        fi1, _ = compactified(i1, chart, sign, resolution)
        requested.extend((("I0", fi0), ("I1", fi1)))
    polynomials = []
    orders = []
    names = []
    for name, poly in requested:
        poly, order = strip_common_axis(poly, 0)
        poly, ratio_order = strip_common_axis(poly, 1)
        polynomials.append(poly)
        orders.append((order, ratio_order))
        names.append(name)
    assert [value[0] for value in orders[:3]] == [2, 3, 3]
    if alternate_pivot:
        assert len(orders) >= 5
    assert len(orders) == 3 + 2 * int(alternate_pivot) + 2 * int(projective_pivot)
    controls = {}
    metadata = {}
    for name, poly in zip(names, polynomials):
        power, degrees, terms = integer_power_array(poly)
        controls[name] = integer_power_to_bernstein_reduced(power)
        metadata[name] = {"degrees_a_b_d_u_v": list(degrees), "term_count": terms}
    for name in names[1:]:
        controls[f"R_for_{name}"] = elevate_tensor_to_shape(
            controls["R"], controls[name].shape, exact=True
        )
    included = ((False, True), (False, True), (True, True), (True, True), (True, True))
    reasons = Counter()
    processed = 0
    deepest = [0, 0, 0, 0, 0]
    unresolved = None
    if reversible_address_stack:
        # Keep deferred cells as addresses, but move between consecutive DFS
        # leaves by exactly inverting midpoint restrictions to their common
        # prefix.  Unlike root reconstruction, this normally backtracks only a
        # few dyadic edges; unlike the tensor stack, only one cell is live.
        pending_addresses = list(initial_addresses) if initial_addresses else [""]
        address = pending_addresses.pop()
        restricted, depth, restricted_sides = restrict_to_address_consuming(
            controls, (0, 0, 0, 0, 0), included, address
        )
        controls = None
        cell = Cell(restricted, depth, address, restricted_sides)
        restricted = None
        for axis in range(5):
            deepest[axis] = max(deepest[axis], depth[axis])
        while cell is not None:
            processed += 1
            if progress_every and processed % progress_every == 0:
                print(
                    json.dumps(
                        {
                            "processed": processed,
                            "stack": len(pending_addresses),
                            "leaves": sum(reasons.values()),
                            "deepest": deepest,
                            "current_address": cell.address,
                            "leaf_reasons": dict(reasons),
                            "elapsed_seconds": round(time.monotonic() - started, 3),
                        }
                    ),
                    flush=True,
                )
            if processed > max_cells:
                unresolved = {
                    "reason": "max_cells",
                    "address": cell.address,
                    "depth": cell.depth,
                    "pending_addresses": [cell.address]
                    + list(reversed(pending_addresses)),
                }
                break
            reason = toric_leaf_reason(
                cell.controls, cell.included_sides, centered_fallback
            )
            if reason:
                reasons[reason] += 1
                if not pending_addresses:
                    cell = None
                    continue
                target_address = pending_addresses.pop()
                moved = navigate_controls_exact(
                    cell.controls,
                    cell.address,
                    target_address,
                    midpoint_restrict_exact,
                )
                _, target_depth, target_sides = restrict_to_address_consuming(
                    {}, (0, 0, 0, 0, 0), included, target_address
                )
                cell = Cell(moved, target_depth, target_address, target_sides)
                moved = None
                for axis in range(5):
                    deepest[axis] = max(deepest[axis], target_depth[axis])
                continue
            if sum(cell.depth) >= max_depth:
                unresolved = {
                    "reason": "max_depth",
                    "address": cell.address,
                    "depth": cell.depth,
                    "pending_addresses": [cell.address]
                    + list(reversed(pending_addresses)),
                }
                break
            axis = (
                choose_alternate_axis(cell.controls, cell.depth)
                if prefer_alternate_axis and (alternate_pivot or projective_pivot)
                else choose_axis(cell.controls, cell.depth)
            )
            pending_addresses.append(cell.address + f"{axis}L")
            right_controls, right_depth, right_sides = restrict_to_address_consuming(
                cell.controls, cell.depth, cell.included_sides, f"{axis}R"
            )
            deepest[axis] = max(deepest[axis], right_depth[axis])
            cell = Cell(
                right_controls,
                right_depth,
                cell.address + f"{axis}R",
                right_sides,
            )
            right_controls = None
    elif address_stack:
        # Preserve the exact right-first DFS order while storing deferred
        # siblings only as addresses.  A deferred cell is reconstructed from
        # the immutable base controls when reached, so live memory is bounded by
        # the base atlas plus one restricted cell instead of a tensor stack.
        base_controls = controls
        pending_addresses = list(initial_addresses) if initial_addresses else [""]
        cell = None
        while cell is not None or pending_addresses:
            if cell is None:
                address = pending_addresses.pop()
                restricted, depth, restricted_sides = restrict_to_address_consuming(
                    dict(base_controls), (0, 0, 0, 0, 0), included, address
                )
                cell = Cell(restricted, depth, address, restricted_sides)
                restricted = None
                for axis in range(5):
                    deepest[axis] = max(deepest[axis], depth[axis])
            processed += 1
            if progress_every and processed % progress_every == 0:
                print(
                    json.dumps(
                        {
                            "processed": processed,
                            "stack": len(pending_addresses),
                            "leaves": sum(reasons.values()),
                            "deepest": deepest,
                            "current_address": cell.address,
                            "leaf_reasons": dict(reasons),
                            "elapsed_seconds": round(time.monotonic() - started, 3),
                        }
                    ),
                    flush=True,
                )
            if processed > max_cells:
                unresolved = {
                    "reason": "max_cells",
                    "address": cell.address,
                    "depth": cell.depth,
                    "pending_addresses": [cell.address] + list(reversed(pending_addresses)),
                }
                break
            reason = toric_leaf_reason(cell.controls, cell.included_sides, centered_fallback)
            if reason:
                reasons[reason] += 1
                cell = None
                continue
            if sum(cell.depth) >= max_depth:
                unresolved = {
                    "reason": "max_depth",
                    "address": cell.address,
                    "depth": cell.depth,
                    "pending_addresses": [cell.address] + list(reversed(pending_addresses)),
                }
                break
            axis = (
                choose_alternate_axis(cell.controls, cell.depth)
                if prefer_alternate_axis and (alternate_pivot or projective_pivot)
                else choose_axis(cell.controls, cell.depth)
            )
            pending_addresses.append(cell.address + f"{axis}L")
            right_controls, right_depth, right_sides = restrict_to_address_consuming(
                cell.controls, cell.depth, cell.included_sides, f"{axis}R"
            )
            deepest[axis] = max(deepest[axis], right_depth[axis])
            cell = Cell(
                right_controls,
                right_depth,
                cell.address + f"{axis}R",
                right_sides,
            )
            right_controls = None
    else:
        # Initial-address cells contain a complete restricted copy of every
        # control tensor.  Load at most one initial subtree eagerly, then use the
        # original full-tensor DFS stack within that subtree.
        pending_initial_addresses = list(initial_addresses)
        stack = []
        if not pending_initial_addresses:
            stack.append(Cell(controls, (0, 0, 0, 0, 0), "", included))
        cell = None
        children = None
        while stack or pending_initial_addresses:
            if not stack:
                cell = None
                children = None
                address = pending_initial_addresses.pop()
                restrict = (
                    restrict_to_address_consuming
                    if len(initial_addresses) == 1
                    else restrict_to_address
                )
                restricted, depth, restricted_sides = restrict(
                    controls, (0, 0, 0, 0, 0), included, address
                )
                if len(initial_addresses) == 1:
                    controls = None
                for axis in range(5):
                    deepest[axis] = max(deepest[axis], depth[axis])
                stack.append(Cell(restricted, depth, address, restricted_sides))
                restricted = None
            cell = stack.pop()
            processed += 1
            if progress_every and processed % progress_every == 0:
                print(
                    json.dumps(
                        {
                            "processed": processed,
                            "stack": len(stack) + len(pending_initial_addresses),
                            "leaves": sum(reasons.values()),
                            "deepest": deepest,
                            "current_address": cell.address,
                            "leaf_reasons": dict(reasons),
                            "elapsed_seconds": round(time.monotonic() - started, 3),
                        }
                    ),
                    flush=True,
                )
            if processed > max_cells:
                unresolved = {
                    "reason": "max_cells",
                    "address": cell.address,
                    "depth": cell.depth,
                    "pending_addresses": [cell.address]
                    + [pending.address for pending in reversed(stack)]
                    + list(reversed(pending_initial_addresses)),
                }
                break
            reason = toric_leaf_reason(cell.controls, cell.included_sides, centered_fallback)
            if reason:
                reasons[reason] += 1
                continue
            if sum(cell.depth) >= max_depth:
                unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
                break
            axis = (
                choose_alternate_axis(cell.controls, cell.depth)
                if prefer_alternate_axis and (alternate_pivot or projective_pivot)
                else choose_axis(cell.controls, cell.depth)
            )
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
            children = None
    return {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_HALF_TORIC_CORE" if unresolved is None else "INCOMPLETE",
        "parity": parity,
        "B_sign": b_sign,
        "toric_chart": chart,
        "resolution": resolution,
        "alternate_pivot": alternate_pivot,
        "projective_pivot": projective_pivot,
        "initial_addresses": initial_addresses,
        "single_initial_consuming": len(initial_addresses) == 1
        and not address_stack
        and not reversible_address_stack,
        "address_stack": address_stack,
        "reversible_address_stack": reversible_address_stack,
        "prefer_alternate_axis": prefer_alternate_axis,
        "centered_fallback": centered_fallback,
        "coordinates": (
            (
                "S=a,Q=a*x,c=1/2-S/16,q=Q/1024,B=sign*a*y/64"
                if resolution == "base"
                else "S=a,Q=a*x^2,c=1/2-S/16,q=Q/1024,B=sign*a*x*y/64"
                if resolution == "branch"
                else "S=a,Q=a*x^2*y,c=1/2-S/16,q=Q/1024,B=sign*a*x/64"
            )
            if chart == "delta_dominant"
            else (
                "Q=a,S=a*x,c=1/2-S/16,q=Q/1024,B=sign*a*y/64"
                if resolution == "base"
                else "Q=a,S=a*x^2,c=1/2-S/16,q=Q/1024,B=sign*a*x*y/64"
                if resolution == "branch"
                else "Q=a,S=a*x^2*y,c=1/2-S/16,q=Q/1024,B=sign*a*x/64"
            )
        ),
        "removed_a_x_orders": orders,
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
    parser.add_argument("--chart", choices=("delta_dominant", "q_dominant"), required=True)
    parser.add_argument("--resolution", choices=("base", "branch", "outer"), default="base")
    parser.add_argument("--max-cells", type=int, default=20_000)
    parser.add_argument("--max-depth", type=int, default=220)
    parser.add_argument("--progress-every", type=int, default=250)
    parser.add_argument("--alternate-pivot", action="store_true")
    parser.add_argument("--projective-pivot", action="store_true")
    parser.add_argument("--initial-address", action="append", default=[])
    stack_mode = parser.add_mutually_exclusive_group()
    stack_mode.add_argument("--address-stack", action="store_true")
    stack_mode.add_argument("--reversible-address-stack", action="store_true")
    parser.add_argument("--prefer-alternate-axis", action="store_true")
    parser.add_argument("--centered-fallback", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = cover(
        args.parity,
        args.b_sign,
        args.chart,
        args.resolution,
        args.max_cells,
        args.max_depth,
        args.progress_every,
        args.alternate_pivot,
        args.projective_pivot,
        args.initial_address,
        args.prefer_alternate_axis,
        args.centered_fallback,
        args.address_stack,
        args.reversible_address_stack,
    )
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
