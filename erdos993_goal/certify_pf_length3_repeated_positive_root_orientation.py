"""Adaptive certificate for the repeated positive-root orientation theorem.

The exact reduction in ``verify_pf_length3_repeated_resultant_reduction.py``
produces a quartic R(r,z,u,v,c) and two orientation polynomials M0,M1.  This
script covers

    r>=0, 0<z<r+5, 0<=u,v<=1, c>0

using two nonsingular charts for the triangular ``(r,z)`` domain:

    r>=z:       r=z+s, z=Z/(1-Z), s=S/(1-S),
    r<z<r+5:   z=r+5W, r=R/(1-R), 0<W<1,

or, for the stronger global route probe, the independent chart
``r=R/(1-R), z=Z/(1-Z)`` covering every ``z>0``.

The resolved chart ``r_ge_z_product`` uses ``w=z(r-z)`` and
``r=z+w/z``; multiplying by a fixed positive power of z clears its Laurent
monomials.  Its reciprocal companion ``r_ge_z_inverse_product`` uses
``p=1/w`` and ``r=z+1/(pz)``.  Restricting respectively to ``w<=1`` and
``p<=1`` resolves the corner ``z->0, r->infinity`` without a singular joint
infinity face.

and in both charts ``c=C/(1-C)``.  The two charts avoid the nontransversal
``r=infinity,Y=0`` corner of the direct substitution ``z=(r+5)Y``.

A leaf is valid when R has a strict sign (so no repeated collision occurs)
or M0 and M1 have the same strict sign.  Shared positive polynomial contents
are removed before compactification.  Exact mode uses integer Bernstein
controls and midpoint de Casteljau subdivision only.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from sympy import QQ
from sympy.polys.rings import ring

from certify_pf_length3_uniform_inner_orientation import (
    domain_strict_positive,
    floating_power_to_bernstein,
    integer_power_to_bernstein,
    midpoint_split_exact,
    midpoint_split_float,
)
from verify_pf_length3_repeated_resultant_reduction import build


HERE = Path(__file__).resolve().parent


def remove_positive_content(poly):
    """Remove the gcd of the c-coefficients (known positive on the domain)."""

    base, r, z, u, v = ring("r,z,u,v", QQ)
    coefficients = []
    for c_power in range(poly.degree(4) + 1):
        coefficients.append(
            base.from_dict(
                {
                    monomial[:-1]: coefficient
                    for monomial, coefficient in poly.terms()
                    if monomial[-1] == c_power
                }
            )
        )
    content = coefficients[0]
    for coefficient in coefficients[1:]:
        content = content.gcd(coefficient)
    primitive = poly.ring.zero
    for c_power, coefficient in enumerate(coefficients):
        quotient = coefficient.exquo(content)
        primitive += poly.ring.from_dict(
            {
                monomial + (c_power,): value
                for monomial, value in quotient.terms()
            }
        )
    # The contents were factored independently in the exact reduction and
    # are products of positive affine reserve factors and (1+4z)^3.
    assert content.degree(u) == content.degree(v) == 0
    return primitive, content


def compact_inverse_ratio_array(poly, region):
    """Compact chart a=c/2, h=2z/c for 0<c<=2 and c>=2z."""

    assert region in ("r_ge_z_product", "r_ge_z_inverse_product")
    terms = poly.terms()
    laurent_clearance = max(m[0] - m[1] for m, _ in terms)
    inverse_clearance = poly.degree(0) if region == "r_ge_z_inverse_product" else 0
    a_factor = min(
        m[1] - m[0] + laurent_clearance + m[4] for m, _ in terms
    )
    h_factor = min(m[1] - m[0] + laurent_clearance for m, _ in terms)
    a_degree = max(
        m[1] + m[0] + laurent_clearance + m[4] - a_factor
        for m, _ in terms
    )
    h_degree = max(
        m[1] + m[0] + laurent_clearance - h_factor for m, _ in terms
    )
    second_degree = poly.degree(0)
    output = np.zeros(
        (
            a_degree + 1,
            second_degree + 1,
            poly.degree(2) + 1,
            poly.degree(3) + 1,
            h_degree + 1,
        ),
        dtype=object,
    )
    common = math.lcm(*(int(q.denominator) for _, q in terms))
    for monomial, coefficient in terms:
        r_power, z_power, u_power, v_power, c_power = monomial
        integer = int(coefficient * common) * 2**c_power
        for split in range(r_power + 1):
            z_exponent = z_power + 2 * split - r_power + laurent_clearance
            a_power = z_exponent + c_power - a_factor
            h_power = z_exponent - h_factor
            second_power = (
                r_power - split
                if region == "r_ge_z_product"
                else inverse_clearance + split - r_power
            )
            base = integer * math.comb(r_power, split)
            for a_extra in range(a_degree - a_power + 1):
                a_index = a_power + a_extra
                a_coefficient = (
                    base
                    * math.comb(a_degree - a_power, a_extra)
                    * (-1) ** a_extra
                )
                for second_extra in range(second_degree - second_power + 1):
                    second_index = second_power + second_extra
                    second_coefficient = (
                        a_coefficient
                        * math.comb(second_degree - second_power, second_extra)
                        * (-1) ** second_extra
                    )
                    # h=1-C on 0<h<=1.
                    for h_index in range(h_power + 1):
                        output[
                            a_index,
                            second_index,
                            u_power,
                            v_power,
                            h_index,
                        ] += (
                            second_coefficient
                            * math.comb(h_power, h_index)
                            * (-1) ** h_index
                        )
    return output


def compact_lower_branch_array(poly, region):
    """Blow up k=c/z<2 with q=(2-k)/2 and z=4*q^2*t."""

    assert region in ("r_ge_z_product", "r_ge_z_inverse_product")
    terms = poly.terms()
    laurent_clearance = max(m[0] - m[1] for m, _ in terms)
    inverse_clearance = poly.degree(0) if region == "r_ge_z_inverse_product" else 0
    common_order = min(
        m[1] - m[0] + laurent_clearance + m[4] for m, _ in terms
    )
    q_factor = 2 * common_order
    t_factor = common_order
    q_degree = max(
        2 * (m[1] + m[0] + laurent_clearance + m[4])
        + m[4]
        - q_factor
        for m, _ in terms
    )
    t_degree = max(
        m[1] + m[0] + laurent_clearance + m[4] - t_factor
        for m, _ in terms
    )
    second_degree = poly.degree(0)
    output = np.zeros(
        (
            q_degree + 1,
            second_degree + 1,
            poly.degree(2) + 1,
            poly.degree(3) + 1,
            t_degree + 1,
        ),
        dtype=object,
    )
    common = math.lcm(*(int(q.denominator) for _, q in terms))
    for monomial, coefficient in terms:
        r_power, z_power, u_power, v_power, c_power = monomial
        integer = int(coefficient * common)
        for split in range(r_power + 1):
            z_exponent = z_power + 2 * split - r_power + laurent_clearance
            order = z_exponent + c_power
            q_base = 2 * order - q_factor
            t_power = order - t_factor
            second_power = (
                r_power - split
                if region == "r_ge_z_product"
                else inverse_clearance + split - r_power
            )
            base = (
                integer
                * math.comb(r_power, split)
                * 4**z_exponent
                * 8**c_power
            )
            for q_extra in range(c_power + 1):
                q_index = q_base + q_extra
                q_coefficient = (
                    base * math.comb(c_power, q_extra) * (-1) ** q_extra
                )
                for second_extra in range(second_degree - second_power + 1):
                    second_index = second_power + second_extra
                    second_coefficient = (
                        q_coefficient
                        * math.comb(second_degree - second_power, second_extra)
                        * (-1) ** second_extra
                    )
                    # t=T/(1-T), after clearing (1-T)^t_degree.
                    for t_extra in range(t_degree - t_power + 1):
                        t_index = t_power + t_extra
                        output[
                            q_index,
                            second_index,
                            u_power,
                            v_power,
                            t_index,
                        ] += (
                            second_coefficient
                            * math.comb(t_degree - t_power, t_extra)
                            * (-1) ** t_extra
                        )
    return output


def compact_power_array(poly, region, c_chart="standard"):
    """Integer coefficients in one of the two triangular-domain charts."""

    if c_chart == "inverse_ratio_bounded":
        return compact_inverse_ratio_array(poly, region)
    if c_chart == "lower_branch":
        return compact_lower_branch_array(poly, region)
    terms = poly.terms()
    ratio_chart = c_chart.startswith("ratio_")
    base_c_chart = c_chart.removeprefix("ratio_") if ratio_chart else c_chart
    u_degree = poly.degree(2)
    v_degree = poly.degree(3)
    c_degree = poly.degree(4)
    if region == "r_ge_z":
        first_degree = max(monomial[0] + monomial[1] for monomial, _ in terms)
        second_degree = poly.degree(0)
    elif region == "z_minus_r":
        first_degree = max(monomial[0] + monomial[1] for monomial, _ in terms)
        second_degree = poly.degree(1)
    elif region == "independent":
        first_degree = poly.degree(0)
        second_degree = poly.degree(1)
    elif region == "r_ge_z_product":
        laurent_clearance = max(
            monomial[0] - monomial[1] for monomial, _ in terms
        )
        first_degree = max(
            monomial[1] + monomial[0] + laurent_clearance
            for monomial, _ in terms
        )
        second_degree = poly.degree(0)
    elif region == "r_ge_z_inverse_product":
        laurent_clearance = max(
            monomial[0] - monomial[1] for monomial, _ in terms
        )
        inverse_clearance = poly.degree(0)
        first_degree = max(
            monomial[1] + monomial[0] + laurent_clearance
            for monomial, _ in terms
        )
        second_degree = inverse_clearance
    else:
        raise ValueError(region)
    ratio_z_factor = 0
    if ratio_chart:
        assert region in ("r_ge_z_product", "r_ge_z_inverse_product")
        ratio_z_factor = min(
            monomial[1] - monomial[0] + laurent_clearance + monomial[4]
            for monomial, _ in terms
        )
        first_degree = max(
            monomial[1]
            + monomial[0]
            + laurent_clearance
            + monomial[4]
            - ratio_z_factor
            for monomial, _ in terms
        )
    output = np.zeros(
        (
            first_degree + 1,
            second_degree + 1,
            u_degree + 1,
            v_degree + 1,
            c_degree + 1,
        ),
        dtype=object,
    )
    common = math.lcm(*(int(coefficient.denominator) for _, coefficient in terms))
    for monomial, coefficient in terms:
        r_power, z_power, u_power, v_power, c_power = monomial
        integer = int(coefficient * common)
        c_remainder = c_degree - c_power
        if base_c_chart == "standard":
            # c=C/(1-C), after multiplying by (1-C)^c_degree.
            c_expanded = [
                (
                    c_power + extra,
                    math.comb(c_remainder, extra) * (-1) ** extra,
                )
                for extra in range(c_remainder + 1)
            ]
        elif base_c_chart == "below_two":
            # c=2(1-C), 0<c<=2.
            c_expanded = [
                (extra, 2**c_power * math.comb(c_power, extra) * (-1) ** extra)
                for extra in range(c_power + 1)
            ]
        elif base_c_chart == "above_two":
            # c=(2-C)/(1-C), c>=2, after clearing (1-C)^c_degree.
            combined = Counter()
            for first in range(c_power + 1):
                first_coefficient = (
                    math.comb(c_power, first)
                    * 2 ** (c_power - first)
                    * (-1) ** first
                )
                for second in range(c_remainder + 1):
                    combined[first + second] += (
                        first_coefficient
                        * math.comb(c_remainder, second)
                        * (-1) ** second
                    )
            c_expanded = list(combined.items())
        else:
            raise ValueError(c_chart)
        expanded = []
        if region == "r_ge_z":
            # r^i z^j=(z+s)^i z^j.
            for split in range(r_power + 1):
                expanded.append(
                    (
                        z_power + split,
                        r_power - split,
                        math.comb(r_power, split),
                    )
                )
        elif region == "z_minus_r":
            # z^j=(r+5W)^j.
            for split in range(z_power + 1):
                expanded.append(
                    (
                        r_power + split,
                        z_power - split,
                        math.comb(z_power, split) * 5 ** (z_power - split),
                    )
                )
        elif region == "independent":
            expanded.append((r_power, z_power, 1))
        elif region == "r_ge_z_product":
            # r=z+w/z; multiply the whole polynomial by z^laurent_clearance.
            for split in range(r_power + 1):
                expanded.append(
                    (
                        z_power + 2 * split - r_power + laurent_clearance,
                        r_power - split,
                        math.comb(r_power, split),
                    )
                )
        else:
            # r=z+1/(p*z); multiply by z^laurent_clearance*p^inverse_clearance.
            for split in range(r_power + 1):
                expanded.append(
                    (
                        z_power + 2 * split - r_power + laurent_clearance,
                        inverse_clearance + split - r_power,
                        math.comb(r_power, split),
                    )
                )
        for first_power, second_power, expansion_coefficient in expanded:
            if ratio_chart:
                # c=z*k; remove the common positive z power.
                first_power += c_power - ratio_z_factor
            first_remainder = first_degree - first_power
            second_remainder = (
                second_degree - second_power
                if region in (
                    "r_ge_z",
                    "independent",
                    "r_ge_z_product",
                    "r_ge_z_inverse_product",
                )
                else 0
            )
            for first_extra in range(first_remainder + 1):
                first_index = first_power + first_extra
                first_coefficient = (
                    expansion_coefficient
                    * math.comb(first_remainder, first_extra)
                    * (-1) ** first_extra
                )
                second_extras = (
                    range(second_remainder + 1)
                    if region in (
                        "r_ge_z",
                        "independent",
                        "r_ge_z_product",
                        "r_ge_z_inverse_product",
                    )
                    else (0,)
                )
                for second_extra in second_extras:
                    second_index = second_power + second_extra
                    second_coefficient = (
                        first_coefficient
                        * math.comb(second_remainder, second_extra)
                        * (-1) ** second_extra
                    )
                    for c_index, c_coefficient in c_expanded:
                        output[
                            first_index,
                            second_index,
                            u_power,
                            v_power,
                            c_index,
                        ] += integer * second_coefficient * c_coefficient
    return output


def bounds(array):
    return min(array.flat), max(array.flat)


def elevate_axis_bernstein(array, axis, target_degree, *, exact):
    """Degree-elevate one tensor Bernstein axis, with one global scale."""

    current_degree = array.shape[axis] - 1
    if current_degree == target_degree:
        return array
    assert current_degree < target_degree
    extra = target_degree - current_degree
    moved = np.moveaxis(array, axis, 0)
    dtype = object if exact else float
    result = np.zeros((target_degree + 1,) + moved.shape[1:], dtype=dtype)
    if exact:
        common = math.lcm(*(math.comb(target_degree, k) for k in range(target_degree + 1)))
    else:
        common = 1.0
    for target_index in range(target_degree + 1):
        low = max(0, target_index - extra)
        high = min(current_degree, target_index)
        denominator = math.comb(target_degree, target_index)
        for source_index in range(low, high + 1):
            numerator = (
                math.comb(current_degree, source_index)
                * math.comb(extra, target_index - source_index)
            )
            weight = (
                numerator * (common // denominator)
                if exact
                else numerator / denominator
            )
            result[target_index] += moved[source_index] * weight
    return np.moveaxis(result, 0, axis)


def elevate_tensor_to_shape(array, target_shape, *, exact):
    result = array
    for axis, size in enumerate(target_shape):
        result = elevate_axis_bernstein(result, axis, size - 1, exact=exact)
    return result


def positive_on_constraint(target, constraint, *, exact):
    """Whether target-lambda*constraint has positive controls for some lambda."""

    if exact:
        lower = None
        upper = None

        def less(left, right):
            return left[0] * right[1] < right[0] * left[1]

        for target_value, constraint_value in zip(target.flat, constraint.flat):
            target_value, constraint_value = int(target_value), int(constraint_value)
            if constraint_value == 0:
                if target_value <= 0:
                    return False
                continue
            bound = (target_value, constraint_value)
            if bound[1] < 0:
                bound = (-bound[0], -bound[1])
            if constraint_value > 0:
                if upper is None or less(bound, upper):
                    upper = bound
            elif lower is None or less(lower, bound):
                lower = bound
        return lower is None or upper is None or less(lower, upper)

    lower = -math.inf
    upper = math.inf
    tolerance = 1e-12
    for target_value, constraint_value in zip(target.flat, constraint.flat):
        target_value, constraint_value = float(target_value), float(constraint_value)
        if abs(constraint_value) <= tolerance:
            if target_value <= tolerance:
                return False
        elif constraint_value > 0:
            upper = min(upper, target_value / constraint_value)
        else:
            lower = max(lower, target_value / constraint_value)
    return lower + tolerance < upper


def leaf_reason(controls, included_sides, *, exact):
    for sign, label in ((1, "R>0"), (-1, "R<0")):
        if domain_strict_positive(
            sign * controls["R"], included_sides, exact=exact
        ):
            return label
    charts = [("M0", "M1")]
    if "N0" in controls:
        charts.append(("N0", "N1"))
    for pair in charts:
        label = pair[0][0]
        positive = all(
            domain_strict_positive(controls[name], included_sides, exact=exact)
            for name in pair
        )
        if positive:
            return f"{label}0>0_and_{label}1>0"
        negative = all(
            domain_strict_positive(-controls[name], included_sides, exact=exact)
            for name in pair
        )
        if negative:
            return f"{label}0<0_and_{label}1<0"
        if f"R_for_{pair[0]}" not in controls:
            continue
        positive_on_r_zero = all(
            positive_on_constraint(
                controls[name], controls[f"R_for_{name}"], exact=exact
            )
            for name in pair
        )
        if positive_on_r_zero:
            return f"{label}0>0_and_{label}1>0_on_R=0"
        negative_on_r_zero = all(
            positive_on_constraint(
                -controls[name], controls[f"R_for_{name}"], exact=exact
            )
            for name in pair
        )
        if negative_on_r_zero:
            return f"{label}0<0_and_{label}1<0_on_R=0"
    return None


def choose_axis(controls, depth):
    target_name = "R"
    low, high = bounds(controls["R"])
    if "M0" in controls and not (low < 0 < high):
        candidates = []
        for name in ("M0", "M1", "N0", "N1"):
            if name not in controls:
                continue
            low, high = bounds(controls[name])
            if low < 0 < high:
                candidates.append((min(-low, high) / max(-low, high), name))
        if candidates:
            target_name = max(candidates)[1]
    target = controls[target_name]
    variations = []
    for axis in range(5):
        if target.shape[axis] <= 1:
            variations.append(-1.0)
        elif target.dtype == object:
            maximum = max(abs(int(value)) for value in np.diff(target, axis=axis).flat)
            variations.append(maximum.bit_length() if maximum else -1)
        else:
            variation = max(abs(float(value)) for value in np.diff(target, axis=axis).flat)
            variations.append(variation / 2 ** depth[axis])
    return max(range(5), key=lambda axis: variations[axis])


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int, int]
    address: str
    included_sides: tuple[tuple[bool, bool], ...]


def cover(
    parity,
    region,
    max_cells,
    max_depth,
    numeric,
    first_half="all",
    second_half="all",
    fifth_half="all",
    c_chart="standard",
    r_only=False,
    use_mod_r=True,
    include_alternate=False,
):
    started = time.monotonic()
    source = build(parity, return_polynomials=True)
    primitive = {}
    content_degrees = {}
    requested = [("R", "resultant")]
    if not r_only:
        requested.extend((("M0", "orientation0"), ("M1", "orientation1")))
        if include_alternate:
            requested.extend(
                (
                    ("N0", "alternate_orientation0"),
                    ("N1", "alternate_orientation1"),
                )
            )
    for output_name, source_name in requested:
        primitive[output_name], content = remove_positive_content(source[source_name])
        content_degrees[output_name] = list(content.degrees())
    uses_equivalent_orientations = (
        c_chart.startswith("ratio_")
        or c_chart in ("inverse_ratio_bounded", "lower_branch")
    ) and not r_only
    if uses_equivalent_orientations:
        rr, zz, uu, vv, cc = primitive["R"].ring.gens
        product_coordinate = zz * (rr - zz)
        uv_factor = (2 * uu + 1) * (2 * vv + 1)
        if parity == "odd":
            uv_constant, single_constant, scalar_constant = 296, 192, 127
        else:
            uv_constant, single_constant, scalar_constant = 360, 224, 143
        next_quotient = (
            336 * uu * vv * product_coordinate
            - uv_constant * uu * vv
            + 96 * uu * product_coordinate
            - single_constant * uu
            + 96 * vv * product_coordinate
            - single_constant * vv
            + 12 * product_coordinate
            - scalar_constant
        )
        primitive["M0"] = (
            zz**7 * primitive["M0"]
            - 128 * product_coordinate**7 * uv_factor * primitive["R"]
        )
        primitive["M1"] = (
            zz**8 * primitive["M1"]
            + 1024 * product_coordinate**8 * uv_factor * primitive["R"]
            - 256
            * product_coordinate**7
            * zz
            * next_quotient
            * primitive["R"]
            - 1024
            * (cc - 2 * zz)
            * product_coordinate**8
            * uv_factor
            * primitive["R"]
        )
    power = {
        name: compact_power_array(poly, region, c_chart)
        for name, poly in primitive.items()
    }
    converter = floating_power_to_bernstein if numeric else integer_power_to_bernstein
    initial = {name: converter(array) for name, array in power.items()}
    if not r_only and use_mod_r:
        for name in ("M0", "M1", "N0", "N1"):
            if name in initial:
                initial[f"R_for_{name}"] = elevate_tensor_to_shape(
                    initial["R"], initial[name].shape, exact=not numeric
                )
    included = (
        (False, False)
        if region in (
            "r_ge_z",
            "r_ge_z_product",
            "r_ge_z_inverse_product",
        )
        else (True, False),
        (True, False)
        if region in ("r_ge_z", "r_ge_z_product")
        else (False, False),
        (True, True),
        (True, True),
        (False, False)
        if c_chart in ("standard", "lower_branch")
        else (True, False),
    )
    initial_address = ""
    initial_depth = (0, 0, 0, 0, 0)
    for axis, half in ((0, first_half), (1, second_half), (4, fifth_half)):
        if half == "all":
            continue
        halves = {
            name: (midpoint_split_float if numeric else midpoint_split_exact)(array, axis)
            for name, array in initial.items()
        }
        child = 0 if half == "lower" else 1
        initial = {name: pair[child] for name, pair in halves.items()}
        initial_address += f"{axis}{'L' if child == 0 else 'R'}"
        next_depth = list(initial_depth)
        next_depth[axis] += 1
        initial_depth = tuple(next_depth)
        included = list(included)
        if child == 0:
            included[axis] = (included[axis][0], True)
        else:
            included[axis] = (True, included[axis][1])
        included = tuple(included)
    stack = [Cell(initial, initial_depth, initial_address, included)]
    reasons = Counter()
    processed = 0
    deepest = [0] * 5
    unresolved = None
    splitter = midpoint_split_float if numeric else midpoint_split_exact
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
        if r_only:
            reason = None
            for sign, label in ((1, "R>0"), (-1, "R<0")):
                if domain_strict_positive(
                    sign * cell.controls["R"],
                    cell.included_sides,
                    exact=not numeric,
                ):
                    reason = label
                    break
        else:
            reason = leaf_reason(cell.controls, cell.included_sides, exact=not numeric)
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
        child_controls = [dict(), dict()]
        for name, array in cell.controls.items():
            child_controls[0][name], child_controls[1][name] = splitter(array, axis)
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        left_sides, right_sides = list(cell.included_sides), list(cell.included_sides)
        left_sides[axis] = (cell.included_sides[axis][0], True)
        right_sides[axis] = (True, cell.included_sides[axis][1])
        # Right-first route finding.
        stack.append(
            Cell(child_controls[0], tuple(next_depth), cell.address + f"{axis}L", tuple(left_sides))
        )
        stack.append(
            Cell(child_controls[1], tuple(next_depth), cell.address + f"{axis}R", tuple(right_sides))
        )
    return {
        "status": (
            "PASS_EXACT_REPEATED_POSITIVE_ROOT_ORIENTATION"
            if unresolved is None and not numeric
            else "PASS_NUMERIC_ROUTE_PROBE"
            if unresolved is None
            else "INCOMPLETE"
        ),
        "parity": parity,
        "triangular_region": region,
        "first_compact_coordinate_half": first_half,
        "second_compact_coordinate_half": second_half,
        "fifth_compact_coordinate_half": fifth_half,
        "c_chart": c_chart,
        "resultant_only": r_only,
        "ratio_chart_uses_resultant_equivalent_orientations": (
            uses_equivalent_orientations
        ),
        "constant_multiplier_mod_R_leaf_enabled": use_mod_r and not r_only,
        "alternate_second_row_pivot_enabled": include_alternate and not r_only,
        "arithmetic": "floating route probe" if numeric else "exact integer Bernstein",
        "processed_cells": processed,
        "certified_leaves": sum(reasons.values()),
        "leaf_reasons": dict(reasons),
        "deepest": deepest,
        "positive_content_degrees_r_z_u_v": content_degrees,
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
            "r_ge_z_product",
            "r_ge_z_inverse_product",
            "z_minus_r",
            "independent",
        ),
        required=True,
    )
    parser.add_argument("--max-cells", type=int, default=1_000_000)
    parser.add_argument("--max-depth", type=int, default=100)
    parser.add_argument("--numeric-probe", action="store_true")
    parser.add_argument(
        "--c-chart",
        choices=(
            "standard",
            "below_two",
            "above_two",
            "ratio_below_two",
            "ratio_above_two",
            "inverse_ratio_bounded",
            "lower_branch",
        ),
        default="standard",
    )
    parser.add_argument(
        "--r-only",
        action="store_true",
        help="Certify that the resultant itself never vanishes; omit orientations.",
    )
    parser.add_argument(
        "--no-mod-r",
        action="store_true",
        help="Omit degree-elevated resultant controls and use direct sign leaves only.",
    )
    parser.add_argument(
        "--alternate-pivot",
        action="store_true",
        help="Also certify with the complementary T=-P1/S1 orientation chart.",
    )
    parser.add_argument(
        "--first-half",
        choices=("all", "lower", "upper"),
        default="all",
        help="Restrict the first compact coordinate to [0,1/2] or [1/2,1].",
    )
    parser.add_argument(
        "--second-half",
        choices=("all", "lower", "upper"),
        default="all",
        help="Restrict the second compact coordinate to [0,1/2] or [1/2,1].",
    )
    parser.add_argument(
        "--fifth-half",
        choices=("all", "lower", "upper"),
        default="all",
        help="Restrict the fifth compact coordinate to [0,1/2] or [1/2,1].",
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = cover(
        args.parity,
        args.region,
        args.max_cells,
        args.max_depth,
        args.numeric_probe,
        args.first_half,
        args.second_half,
        args.fifth_half,
        args.c_chart,
        args.r_only,
        not args.no_mod_r,
        args.alternate_pivot,
    )
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
