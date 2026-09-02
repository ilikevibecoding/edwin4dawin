"""Exact adaptive Bernstein cover for the PF length-three inner strip.

For a fixed parity and reserve index, form the four quadratically filtered
rows ``h_0,...,h_3`` at ``x=-z`` and the three PF minors

    D0=h1^2-h0*h2,  D2=h2^2-h1*h3,  E=h0*h3-h1*h2.

A positive two-factor PF collision would require ``D0,D2,E`` to have one
sign and ``H=E^2-4*D0*D2 >= 0``.  In this window the only possible common
sign is positive.  The basic exclusion disjunction is

    D0<=0 or D2<=0 or E<=0 or 4*D0*D2-E^2>0.

The implementation also uses exact one-signed-row exclusions, positive
linear separators between minor sign surfaces, and conditional
``K-lambda*D_i`` certificates.  The known powers z^2,z^4,z^3,z^6 are divided
out first and z=(r+5)y.  Every leaf is certified by exact tensor Bernstein
bounds.  Subdivision uses integer midpoint de Casteljau transforms, so no
floating point enters the proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from collections import Counter, deque
from dataclasses import dataclass
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial


HERE = Path(__file__).resolve().parent
Y, U, V = sp.symbols("y u v")


def normalized_inner_polynomials(
    parity: str, reserve_index: int, *, ordered_triangle: bool = False
):
    r = reserve_index
    if parity == "odd":
        p, alpha = 2 * r + 17, 2 * r
    elif parity == "even":
        p, alpha = 2 * r + 18, 2 * r + 1
    else:
        raise ValueError(parity)

    z = sp.Integer(r + 5) * Y
    gamma = [sp.Integer(1), -(U + V), U * V]
    rows = [
        sp.Poly(
            sp.expand(
                (X**j * window_polynomial(p - 2 * j, alpha + j, gamma).as_expr())
                .subs(X, -z)
            ),
            Y,
            U,
            V,
            domain=sp.QQ,
        )
        for j in range(4)
    ]
    h = [row.as_expr() for row in rows]
    raw = {
        "D0": sp.Poly(h[1] ** 2 - h[0] * h[2], Y, U, V, domain=sp.QQ),
        "D2": sp.Poly(h[2] ** 2 - h[1] * h[3], Y, U, V, domain=sp.QQ),
        "E": sp.Poly(h[0] * h[3] - h[1] * h[2], Y, U, V, domain=sp.QQ),
    }
    raw["K"] = sp.Poly(
        4 * raw["D0"].as_expr() * raw["D2"].as_expr()
        - raw["E"].as_expr() ** 2,
        Y,
        U,
        V,
        domain=sp.QQ,
    )
    for j, row in enumerate(rows):
        raw[f"H{j}"] = row
    powers = {
        "D0": 2, "D2": 4, "E": 3, "K": 6,
        "H0": 0, "H1": 1, "H2": 2, "H3": 3,
    }
    normalized = {}
    for name, polynomial in raw.items():
        quotient = sp.cancel(polynomial.as_expr() / Y ** powers[name])
        if ordered_triangle:
            # By u<->v symmetry it is enough to cover 0<=u<=v<=1.
            # The cube map v=u+(1-u)*V parameterizes that triangle.
            quotient = sp.expand(quotient.subs(V, U + (1 - U) * V))
        check = sp.Poly(quotient, Y, U, V, domain=sp.QQ)
        if not ordered_triangle:
            assert sp.expand(
                check.as_expr() * Y ** powers[name] - polynomial.as_expr()
            ) == 0
        normalized[name] = check
    return p, alpha, normalized


def rational_bernstein_controls(poly: sp.Poly, degrees):
    power = {monomial: coefficient for monomial, coefficient in poly.terms()}
    controls = {}
    for index in __import__("itertools").product(
        *[range(degree + 1) for degree in degrees]
    ):
        value = sp.S.Zero
        for exponent in __import__("itertools").product(
            *[range(bound + 1) for bound in index]
        ):
            coefficient = power.get(exponent, sp.S.Zero)
            if not coefficient:
                continue
            multiplier = sp.S.One
            for i, k, degree in zip(index, exponent, degrees):
                multiplier *= sp.Rational(math.comb(i, k), math.comb(degree, k))
            value += coefficient * multiplier
        value = sp.Rational(value)
        controls[index] = value
    return controls


def common_integer_bernstein_controls(polynomials):
    degree_records = {
        name: tuple(poly.degree(variable) for variable in (Y, U, V))
        for name, poly in polynomials.items()
    }
    degrees = tuple(
        max(degree_records[name][axis] for name in degree_records)
        for axis in range(3)
    )
    rational = {
        name: rational_bernstein_controls(poly, degrees)
        for name, poly in polynomials.items()
    }
    common = sp.ilcm(
        *[
            value.q
            for controls in rational.values()
            for value in controls.values()
        ]
    )
    shape = tuple(degree + 1 for degree in degrees)
    arrays = {}
    for name, controls in rational.items():
        array = __import__("numpy").empty(shape, dtype=object)
        for index, value in controls.items():
            array[index] = int(value * common)
        arrays[name] = array
    return degree_records, degrees, arrays


def independent_integer_bernstein_controls(poly: sp.Poly):
    degrees = tuple(poly.degree(variable) for variable in (Y, U, V))
    controls = rational_bernstein_controls(poly, degrees)
    common = sp.ilcm(*[value.q for value in controls.values()])
    shape = tuple(degree + 1 for degree in degrees)
    array = __import__("numpy").empty(shape, dtype=object)
    for index, value in controls.items():
        array[index] = int(value * common)
    return degrees, array


def midpoint_split(array, axis: int):
    """Return exact left/right Bernstein arrays, each with one common scale."""
    import numpy as np

    degree = array.shape[axis] - 1
    left = np.empty_like(array)
    right = np.empty_like(array)
    other_shape = array.shape[:axis] + array.shape[axis + 1 :]
    for other in __import__("itertools").product(
        *[range(size) for size in other_shape]
    ):
        selector = list(other)
        selector.insert(axis, slice(None))
        line = list(array[tuple(selector)])
        lline = []
        rline = []
        for i in range(degree + 1):
            lline.append(
                2 ** (degree - i)
                * sum(math.comb(i, k) * line[k] for k in range(i + 1))
            )
            rline.append(
                2**i
                * sum(
                    math.comb(degree - i, k - i) * line[k]
                    for k in range(i, degree + 1)
                )
            )
        left[tuple(selector)] = lline
        right[tuple(selector)] = rline
    return left, right


def all_nonpositive(array) -> bool:
    return all(value <= 0 for value in array.flat)


def all_nonnegative(array) -> bool:
    return all(value >= 0 for value in array.flat)


def all_strictly_positive(array) -> bool:
    return all(value > 0 for value in array.flat)


def all_strictly_negative(array) -> bool:
    return all(value < 0 for value in array.flat)


def positive_modulo_one_constraint(target, constraint):
    """Find lambda>=0 with target-lambda*constraint Bernstein-positive."""
    # Bounds are kept as integer numerator/positive-denominator pairs.  A
    # mediant gives an exact interior rational without the repeated gcd work
    # incurred by Fraction on large de Casteljau integers.
    lower = (0, 1)
    upper = None

    def less(left, right):
        return left[0] * right[1] < right[0] * left[1]

    for target_value, constraint_value in zip(target.flat, constraint.flat):
        target_value = int(target_value)
        constraint_value = int(constraint_value)
        if constraint_value == 0:
            if target_value <= 0:
                return None
        elif constraint_value > 0:
            if target_value <= 0:
                return None
            bound = (target_value, constraint_value)
            if upper is None or less(bound, upper):
                upper = bound
        else:
            bound = (-target_value, -constraint_value)
            if less(lower, bound):
                lower = bound
    if upper is not None and not less(lower, upper):
        return None
    candidate = (
        (lower[0] + lower[1], lower[1])
        if upper is None
        else (lower[0] + upper[0], lower[1] + upper[1])
    )
    numerator, denominator = candidate
    assert numerator >= 0 and denominator > 0
    assert all(
        int(target_value) * denominator
        - numerator * int(constraint_value)
        > 0
        for target_value, constraint_value in zip(target.flat, constraint.flat)
    )
    return candidate


def choose_constraint_aware_axis(controls, depth):
    """Follow the strongest Bernstein variation of the nearest sign test."""
    import numpy as np

    candidates = []
    for name in ("D0", "D2", "E"):
        values = controls[name]
        low, high = min(values.flat), max(values.flat)
        if low < 0 < high:
            candidates.append((sp.Rational(high, high - low), name))
    values = controls["K"]
    low, high = min(values.flat), max(values.flat)
    if low < 0 < high:
        candidates.append((sp.Rational(-low, high - low), "K"))
    target_name = min(candidates)[1] if candidates else "K"
    target = controls[target_name]
    variations = []
    for axis in range(3):
        if target.shape[axis] <= 1:
            variations.append(-1)
            continue
        difference = np.diff(target, axis=axis)
        variation = max(abs(value) for value in difference.flat)
        variations.append(sp.Rational(variation, 2 ** depth[axis]))
    return max(range(3), key=lambda axis: variations[axis])


@dataclass
class Cell:
    controls: dict[str, object]
    depth: tuple[int, int, int]
    address: str


def certify(
    parity: str,
    reserve_index: int,
    max_cells: int,
    max_depth: int,
    *,
    ordered_triangle: bool,
    depth_first: bool = False,
):
    p, alpha, polynomials = normalized_inner_polynomials(
        parity, reserve_index, ordered_triangle=ordered_triangle
    )
    degree_records = {}
    initial = {}
    for name, polynomial in polynomials.items():
        degrees, controls = independent_integer_bernstein_controls(polynomial)
        degree_records[name] = degrees
        initial[name] = controls

    queue = deque([Cell(initial, (0, 0, 0), "")])
    leaf_reasons = Counter()
    leaf_digest = hashlib.sha256()
    processed = 0
    deepest = [0, 0, 0]
    unresolved = None
    started = time.monotonic()

    while queue:
        cell = queue.pop() if depth_first else queue.popleft()
        processed += 1
        if processed % 10_000 == 0:
            print(
                json.dumps(
                    {
                        "checkpoint": processed,
                        "certified_leaves": sum(leaf_reasons.values()),
                        "queued_cells": len(queue),
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
        multiplier = None
        # The actual kernel rows have positive weights.  Hence either
        # one-signed triple (h0,h1,h2) or (h1,h2,h3) rules out a collision
        # directly.  This is essential near harmless rank-one Hankel points,
        # where every minor vanishes but the common geometric ratio is
        # positive rather than the negative ratio required by c,d>0.
        for start in (0, 1):
            names = [f"H{start + offset}" for offset in range(3)]
            arrays = [cell.controls[name] for name in names]
            if all(all_nonnegative(array) for array in arrays) and any(
                all_strictly_positive(array) for array in arrays
            ):
                reason = f"H{start}:H{start + 2}>=0"
                break
            if all(all_nonpositive(array) for array in arrays) and any(
                all_strictly_negative(array) for array in arrays
            ):
                reason = f"H{start}:H{start + 2}<=0"
                break
        for name in ("D0", "D2", "E"):
            if reason is not None:
                break
            if all_nonpositive(cell.controls[name]):
                reason = f"{name}<=0"
                break
        # Correlated sign surfaces are the main source of artificial box
        # proliferation.  A positive linear combination of D2 and E which is
        # nonpositive excludes their simultaneous positivity even when neither
        # polynomial has a one-signed Bernstein hull on its own.
        crosses = {
            name: min(cell.controls[name].flat) < 0
            < max(cell.controls[name].flat)
            for name in ("D0", "D2", "E")
        }
        if reason is None:
            for first, second in (
                ("D0", "D2"), ("D0", "E"), ("D2", "E")
            ):
                if not (crosses[first] and crosses[second]):
                    continue
                for target_name, constraint_name in (
                    (first, second), (second, first)
                ):
                    candidate = positive_modulo_one_constraint(
                        -cell.controls[target_name],
                        cell.controls[constraint_name],
                    )
                    if candidate is not None:
                        reason = (
                            f"{target_name}+lambda*{constraint_name}<0"
                        )
                        multiplier = candidate
                        break
                if reason is not None:
                    break
        if reason is None and all_strictly_positive(cell.controls["K"]):
            reason = "K>0"
        # A one-constraint conditional certificate: K-lambda*D2>0 (or the
        # analogous E certificate) proves K>0 throughout the dangerous side
        # where the selected constraint is nonnegative.
        k_crosses = (
            min(cell.controls["K"].flat) < 0
            < max(cell.controls["K"].flat)
        )
        if reason is None and k_crosses:
            for constraint_name in ("D0", "D2", "E"):
                if not crosses[constraint_name]:
                    continue
                candidate = positive_modulo_one_constraint(
                    cell.controls["K"], cell.controls[constraint_name]
                )
                if candidate is not None:
                    reason = f"K-lambda*{constraint_name}>0"
                    multiplier = candidate
                    break
        if reason is not None:
            leaf_reasons[reason] += 1
            leaf_digest.update(
                f"{cell.address}:{reason}:{multiplier};".encode("ascii")
            )
            continue

        if sum(cell.depth) >= max_depth:
            unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
            break

        # Split the coordinate with the largest unresolved Bernstein scale.
        axis = choose_constraint_aware_axis(cell.controls, cell.depth)
        children = [dict(), dict()]
        for name, controls in cell.controls.items():
            left, right = midpoint_split(controls, axis)
            children[0][name] = left
            children[1][name] = right
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        queue.append(Cell(children[0], tuple(next_depth), cell.address + f"{axis}L"))
        queue.append(Cell(children[1], tuple(next_depth), cell.address + f"{axis}R"))

    return {
        "status": "PASS_EXACT_FIXED_ORDER_INNER_BERNSTEIN_COVER" if unresolved is None else "INCOMPLETE",
        "parity": parity,
        "reserve_index": reserve_index,
        "p": p,
        "alpha": alpha,
        "inner_region": f"0<=z<={reserve_index + 5}",
        "filter_parameter_domain": (
            "0<=u<=v<=1 via v=u+(1-u)*V; full square follows by symmetry"
            if ordered_triangle
            else "0<=u,v<=1"
        ),
        "normalized_degrees_y_u_v": {
            name: list(values) for name, values in degree_records.items()
        },
        "processed_cell_count": processed,
        "certified_leaf_count": sum(leaf_reasons.values()),
        "leaf_reasons": dict(leaf_reasons),
        "deepest_coordinate_subdivisions": deepest,
        "leaf_certificate_digest": leaf_digest.hexdigest(),
        "unresolved": unresolved,
        "conclusion": (
            "Every point is excluded by a one-signed adjacent row triple, "
            "a nonpositive minor, an exact positive minor separator, or a "
            "strict/conditional K>0 certificate; hence no positive-PF "
            "collision occurs."
            if unresolved is None
            else "The requested resource limit did not complete the exact cover."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), required=True)
    parser.add_argument("--r", type=int, required=True)
    parser.add_argument("--max-cells", type=int, default=2_000_000)
    parser.add_argument("--max-depth", type=int, default=80)
    parser.add_argument("--ordered-triangle", action="store_true")
    parser.add_argument("--depth-first", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    assert args.r >= 0
    report = certify(
        args.parity,
        args.r,
        args.max_cells,
        args.max_depth,
        ordered_triangle=args.ordered_triangle,
        depth_first=args.depth_first,
    )
    output = args.output or HERE / (
        f"pf_length3_inner_{args.parity}_r{args.r}_bernstein_exact_20260807.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
