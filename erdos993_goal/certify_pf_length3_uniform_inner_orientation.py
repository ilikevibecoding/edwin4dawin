"""Uniform bounded-degree certificate for PF length-three inner orientation.

This replaces the growing-degree fixed-order rows by their affine Riccati
coordinates.  The reserve is compactified by ``r=R/(1-R)``, the inner strip
by ``z=(r+5)Y``, and the unrestricted Riccati coordinate by the two blow-up
charts ``T=+zW/(1-W)`` and ``T=-zW/(1-W)``.  After positive denominator clearing,
all relevant expressions have fixed multidegree in the five unit-cube
variables ``R,Y,u,v,W``.

The proof target is the implication

    D0,D2,E>0 and 4*D0*D2-E^2<=0  ==>  A*B>0,

where A and B are the two collision derivative orientations.  A Bernstein
leaf is certified if it excludes the collision conditions, or if A and B
are strictly one-signed in the same direction.  The ``--numeric-probe``
mode uses floating-point Bernstein arithmetic only to tune the subdivision;
it is never reported as an exact proof.
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


HERE = Path(__file__).resolve().parent


def riccati_polynomials(parity: str):
    ambient, r, z, u, v, t = ring("r,z,u,v,t", QQ)
    if parity == "odd":
        p, alpha = 2 * r + 17, 2 * r
    elif parity == "even":
        p, alpha = 2 * r + 18, 2 * r + 1
    else:
        raise ValueError(parity)

    # K_j=(constant+slope*T)/denominator and K_0=1,K_1=T.
    numerators = [(ambient.one, ambient.zero), (ambient.zero, ambient.one)]
    denominators = [ambient.one, ambient.one]
    recurrence_denominators = []
    for j in range(4):
        current_p, current_alpha = p - 2 * j, alpha + j
        denominator = (1 + 4 * z) * (current_p - 2) * (current_p - 3)
        linear = (p + alpha - j - 1) * (
            z * (4 * current_p - 6) - (current_alpha + 1)
        )
        constant = (p + alpha - j - 1) * z * (current_p + current_alpha)
        previous = ambient.one if j == 0 else recurrence_denominators[-1]
        numerators.append(
            (
                linear * numerators[-1][0]
                - constant * previous * numerators[-2][0],
                linear * numerators[-1][1]
                - constant * previous * numerators[-2][1],
            )
        )
        denominators.append(denominator * denominators[-1])
        recurrence_denominators.append(denominator)

    common_denominator = denominators[5]
    source_sum, source_product = u + v, u * v
    rows = []
    for j in range(4):
        row = ambient.zero
        for coefficient, index in (
            (ambient.one, j),
            (-source_sum, j + 1),
            (source_product, j + 2),
        ):
            row += (
                coefficient
                * (numerators[index][0] + numerators[index][1] * t)
                * common_denominator.exquo(denominators[index])
            )
        rows.append(row)

    h0, h1, h2, h3 = rows
    d0 = h1**2 - h0 * h2
    d2 = h2**2 - h1 * h3
    e = h0 * h3 - h1 * h2

    # F=dT/dz=F_numerator/F_denominator is the source Riccati flow.
    flow_denominator = z * (1 + 4 * z) * (p + alpha)
    flow_numerator = (
        (p + alpha) * (z * (4 * p - 2) - alpha) * t
        - z * (p + alpha) ** 2
        - (1 + 4 * z) * p * (p - 1) * t**2
    )
    derivatives = [
        flow_denominator * row.diff(z) + flow_numerator * row.diff(t)
        for row in rows
    ]
    orientation0 = d2 * derivatives[0] + e * derivatives[1] + d0 * derivatives[2]
    orientation1 = d2 * derivatives[1] + e * derivatives[2] + d0 * derivatives[3]

    k = 4 * d0 * d2 - e**2
    return {
        "H0": h0,
        "H1": h1,
        "H2": h2,
        "H3": h3,
        "D0": d0,
        "D2": d2,
        "E": e,
        "K": k,
        "A": orientation0,
        "B": orientation1,
    }


def compact_power_array(poly, t_sign: int):
    """Return coefficients after T=z*sign*W/(1-W) compactification.

    The smallest resulting power of z is divided out.  It is strictly
    positive in the open strip and removes the nontransversal y=0 corner.
    """

    terms = poly.terms()
    z_divisor = min(monomial[1] + monomial[4] for monomial, _ in terms)
    reserve_degree = max(
        monomial[0] + monomial[1] + monomial[4] - z_divisor
        for monomial, _ in terms
    )
    y_degree = max(
        monomial[1] + monomial[4] - z_divisor for monomial, _ in terms
    )
    u_degree = poly.degree(poly.ring.gens[2])
    v_degree = poly.degree(poly.ring.gens[3])
    t_degree = poly.degree(poly.ring.gens[4])
    shape = (
        reserve_degree + 1,
        y_degree + 1,
        u_degree + 1,
        v_degree + 1,
        t_degree + 1,
    )
    output = np.zeros(shape, dtype=object)

    coefficient_denominators = [int(coefficient.denominator) for _, coefficient in terms]
    common = math.lcm(*coefficient_denominators)
    for monomial, coefficient in terms:
        r_power, raw_z_power, u_power, v_power, t_power = monomial
        z_power = raw_z_power + t_power - z_divisor
        integer_coefficient = int(coefficient * common)
        reserve_remainder = reserve_degree - r_power - z_power
        t_remainder = t_degree - t_power
        for first in range(z_power + 1):
            # (5-4R)^z_power
            first_coefficient = (
                math.comb(z_power, first)
                * 5 ** (z_power - first)
                * (-4) ** first
            )
            for second in range(reserve_remainder + 1):
                # (1-R)^reserve_remainder
                reserve_index = r_power + first + second
                reserve_coefficient = (
                    first_coefficient
                    * math.comb(reserve_remainder, second)
                    * (-1) ** second
                )
                for third in range(t_remainder + 1):
                    # (sign*W)^t_power (1-W)^t_remainder
                    t_index = t_power + third
                    t_coefficient = (
                        t_sign**t_power
                        * math.comb(t_remainder, third)
                        * (-1) ** third
                    )
                    output[
                        reserve_index,
                        z_power,
                        u_power,
                        v_power,
                        t_index,
                    ] += integer_coefficient * reserve_coefficient * t_coefficient
    return output, common, z_divisor


def integer_power_to_bernstein(array: np.ndarray) -> np.ndarray:
    """Exact tensor power-to-Bernstein conversion with one positive scale."""

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
        result = np.moveaxis(converted, 0, axis)
    return result


def floating_power_to_bernstein(array: np.ndarray) -> np.ndarray:
    result = np.asarray(array, dtype=float)
    maximum = np.max(np.abs(result))
    if maximum:
        result /= maximum
    for axis, size in enumerate(result.shape):
        degree = size - 1
        if degree == 0:
            continue
        moved = np.moveaxis(result, axis, 0)
        converted = np.empty_like(moved)
        for index in range(degree + 1):
            value = np.zeros(moved.shape[1:], dtype=float)
            for power in range(index + 1):
                value += (
                    moved[power]
                    * math.comb(index, power)
                    / math.comb(degree, power)
                )
            converted[index] = value
        result = np.moveaxis(converted, 0, axis)
    return result


def midpoint_split_float(array: np.ndarray, axis: int):
    moved = np.moveaxis(array, axis, 0)
    degree = moved.shape[0] - 1
    work = moved.copy()
    left = np.empty_like(moved)
    right = np.empty_like(moved)
    left[0], right[degree] = work[0], work[degree]
    for level in range(1, degree + 1):
        work = (work[:-1] + work[1:]) / 2
        left[level] = work[0]
        right[degree - level] = work[-1]
    return np.moveaxis(left, 0, axis), np.moveaxis(right, 0, axis)


def midpoint_split_exact(array: np.ndarray, axis: int):
    """Integer midpoint de Casteljau; both children share one scale."""

    moved = np.moveaxis(array, axis, 0)
    degree = moved.shape[0] - 1
    work = moved.copy()
    left = np.empty_like(moved)
    right = np.empty_like(moved)
    left[0] = work[0] * 2**degree
    right[degree] = work[degree] * 2**degree
    for level in range(1, degree + 1):
        work = work[:-1] + work[1:]
        left[level] = work[0] * 2 ** (degree - level)
        right[degree - level] = work[-1] * 2 ** (degree - level)
    return np.moveaxis(left, 0, axis), np.moveaxis(right, 0, axis)


def bounds(array):
    return min(array.flat), max(array.flat)


def positive_modulo_constraint(target, constraint, *, exact: bool):
    """Whether target-lambda*constraint is positive for some lambda>=0."""

    if exact:
        lower = (0, 1)
        upper = None

        def less(left, right):
            return left[0] * right[1] < right[0] * left[1]

        for target_value, constraint_value in zip(target.flat, constraint.flat):
            target_value, constraint_value = int(target_value), int(constraint_value)
            if constraint_value == 0:
                if target_value <= 0:
                    return False
            elif constraint_value > 0:
                if target_value <= 0:
                    return False
                bound = (target_value, constraint_value)
                if upper is None or less(bound, upper):
                    upper = bound
            else:
                bound = (-target_value, -constraint_value)
                if less(lower, bound):
                    lower = bound
        return upper is None or less(lower, upper)

    lower = 0.0
    upper = math.inf
    tolerance = 1e-12
    for target_value, constraint_value in zip(target.flat, constraint.flat):
        target_value = float(target_value)
        constraint_value = float(constraint_value)
        if constraint_value == 0:
            if target_value <= tolerance:
                return False
        elif constraint_value > 0:
            if target_value <= tolerance:
                return False
            upper = min(upper, target_value / constraint_value)
        else:
            lower = max(lower, -target_value / -constraint_value)
    return lower + tolerance < upper


def domain_strict_positive(array, included_sides, *, exact: bool):
    """Positive on a box with selected global sides removed.

    Nonnegative Bernstein controls suffice once no included coordinate face
    has an identically zero restriction.  This permits harmless vanishing at
    the projective faces R=1, Y=0, Y=1, and W=1.
    """

    tolerance = 0
    if any(value < -tolerance for value in array.flat):
        return False
    choices = []
    for axis, (lower_included, upper_included) in enumerate(included_sides):
        current = [slice(None)]
        if lower_included:
            current.append(0)
        if upper_included:
            current.append(array.shape[axis] - 1)
        choices.append(current)
    for selector in itertools.product(*choices):
        restriction = array[selector]
        values = restriction.flat if hasattr(restriction, "flat") else (restriction,)
        if not any(value > tolerance for value in values):
            return False
    return True


def leaf_reason(controls, included_sides, *, exact: bool):
    strict_margin = 0 if exact else 1e-11

    # A one-signed adjacent row triple cannot annihilate positive weights.
    for start in (0, 1):
        triples = [bounds(controls[f"H{start + offset}"]) for offset in range(3)]
        if all(low >= 0 for low, _ in triples) and any(
            low > strict_margin for low, _ in triples
        ):
            return f"H{start}:H{start + 2}>=0"
        if all(high <= 0 for _, high in triples) and any(
            high < -strict_margin for _, high in triples
        ):
            return f"H{start}:H{start + 2}<=0"

    minor_bounds = {name: bounds(controls[name]) for name in ("D0", "D2", "E")}
    for name, (_, high) in minor_bounds.items():
        if high <= 0:
            return f"{name}<=0"

    # D0 and E carry the same removed z power and the same Bernstein scale.
    # A negative positive combination excludes D0>0 and E>0 simultaneously.
    for target_name, constraint_name in (("D0", "E"), ("E", "D0")):
        if positive_modulo_constraint(
            -controls[target_name], controls[constraint_name], exact=exact
        ):
            return f"{target_name}+lambda*{constraint_name}<0"

    if domain_strict_positive(
        controls["K"], included_sides, exact=exact
    ):
        return "K>0"

    a_low, a_high = bounds(controls["A"])
    b_low, b_high = bounds(controls["B"])
    if domain_strict_positive(
        controls["A"], included_sides, exact=exact
    ) and domain_strict_positive(
        controls["B"], included_sides, exact=exact
    ):
        return "A>0_and_B>0"
    if domain_strict_positive(
        -controls["A"], included_sides, exact=exact
    ) and domain_strict_positive(
        -controls["B"], included_sides, exact=exact
    ):
        return "A<0_and_B<0"
    return None


def choose_axis(controls, depth):
    candidates = []
    for name in ("D0", "D2", "E", "K", "A", "B"):
        low, high = bounds(controls[name])
        if low < 0 < high:
            relative = min(-low, high) / max(abs(low), abs(high))
            candidates.append((relative, name))
    target_name = max(candidates)[1] if candidates else "E"
    target = controls[target_name]
    variations = []
    for axis in range(5):
        if target.shape[axis] == 1:
            variations.append(-1.0)
            continue
        difference = np.diff(target, axis=axis)
        variation = max(abs(float(value)) for value in difference.flat)
        variations.append(variation / 2 ** depth[axis])
    return max(range(5), key=lambda axis: variations[axis])


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int, int]
    address: str
    included_sides: tuple[tuple[bool, bool], ...]


def run_cover(parity: str, t_sign: int, max_cells: int, max_depth: int, numeric: bool):
    started = time.monotonic()
    polynomials = riccati_polynomials(parity)
    power = {}
    denominator_scales = {}
    removed_z_powers = {}
    for name, polynomial in polynomials.items():
        (
            power[name],
            denominator_scales[name],
            removed_z_powers[name],
        ) = compact_power_array(polynomial, t_sign)
    converter = floating_power_to_bernstein if numeric else integer_power_to_bernstein
    initial = {name: converter(array) for name, array in power.items()}
    if numeric:
        group = ("D0", "E")
        maximum = max(np.max(np.abs(power[name].astype(float))) for name in group)
        for name in group:
            own = np.max(np.abs(power[name].astype(float)))
            if maximum and own:
                initial[name] *= own / maximum
    # R=1 and W=1 are projective infinities; Y=0,1 are the already handled
    # open-strip endpoints.  u and v are genuinely closed parameters.
    initial_included = (
        (True, False),
        (False, False),
        (True, True),
        (True, True),
        (True, False),
    )
    stack = [Cell(initial, (0, 0, 0, 0, 0), "", initial_included)]
    reasons = Counter()
    processed = 0
    deepest = [0] * 5
    unresolved = None
    split = midpoint_split_float if numeric else midpoint_split_exact
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
            if numeric:
                unresolved["control_bounds"] = {
                    name: [float(value) for value in bounds(array)]
                    for name, array in cell.controls.items()
                }
            break
        reason = leaf_reason(
            cell.controls, cell.included_sides, exact=not numeric
        )
        if reason is not None:
            reasons[reason] += 1
            continue
        if sum(cell.depth) >= max_depth:
            unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
            if numeric:
                unresolved["control_bounds"] = {
                    name: [float(value) for value in bounds(array)]
                    for name, array in cell.controls.items()
                }
            break
        axis = choose_axis(cell.controls, cell.depth)
        children = [dict(), dict()]
        for name, array in cell.controls.items():
            children[0][name], children[1][name] = split(array, axis)
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        left_sides = list(cell.included_sides)
        right_sides = list(cell.included_sides)
        left_sides[axis] = (cell.included_sides[axis][0], True)
        right_sides[axis] = (True, cell.included_sides[axis][1])
        # Explore the projective/infinite side first during route finding;
        # the all-zero corner has additional harmless rank degeneracies that
        # are better handled after the generic interior certificate is tuned.
        stack.append(
            Cell(
                children[0], tuple(next_depth), cell.address + f"{axis}L",
                tuple(left_sides),
            )
        )
        stack.append(
            Cell(
                children[1], tuple(next_depth), cell.address + f"{axis}R",
                tuple(right_sides),
            )
        )

    return {
        "status": (
            "PASS_EXACT_UNIFORM_INNER_ORIENTATION"
            if unresolved is None and not numeric
            else "PASS_NUMERIC_SUBDIVISION_PROBE"
            if unresolved is None
            else "INCOMPLETE"
        ),
        "parity": parity,
        "riccati_chart": "+z*W/(1-W)" if t_sign > 0 else "-z*W/(1-W)",
        "arithmetic": "floating-point route probe" if numeric else "exact integer Bernstein",
        "processed_cells": processed,
        "certified_leaves": sum(reasons.values()),
        "leaf_reasons": dict(reasons),
        "deepest": deepest,
        "removed_positive_z_powers": removed_z_powers,
        "unresolved": unresolved,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), required=True)
    parser.add_argument("--t-sign", choices=("positive", "negative"), required=True)
    parser.add_argument("--max-cells", type=int, default=100_000)
    parser.add_argument("--max-depth", type=int, default=100)
    parser.add_argument("--numeric-probe", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = run_cover(
        args.parity,
        1 if args.t_sign == "positive" else -1,
        args.max_cells,
        args.max_depth,
        args.numeric_probe,
    )
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
