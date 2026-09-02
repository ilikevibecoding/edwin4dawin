#!/usr/bin/env python3
"""Adaptive exact Bernstein subdivision diagnostic for Delta1 mask 3."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_shadow_adaptive_subdivision_probe_root_20260825.json"
MAX_DEPTH = 40
MAX_BOXES = 500_000


def power_to_bernstein(polynomial: sp.Poly) -> tuple[tuple[int, ...], dict[tuple[int, ...], Fraction]]:
    degrees = tuple(polynomial.degree(variable) for variable in polynomial.gens)
    power = {
        monomial: Fraction(int(coefficient.p), int(coefficient.q))
        for monomial, coefficient in polynomial.terms()
    }
    tensor = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = Fraction(0)
        for monomial, coefficient in power.items():
            if any(source > target for source, target in zip(monomial, index)):
                continue
            weight = Fraction(1)
            for source, target, degree in zip(monomial, index, degrees):
                weight *= Fraction(
                    math.comb(target, source), math.comb(degree, source)
                )
            value += coefficient * weight
        tensor[index] = value
    return degrees, tensor


def power_to_bernstein_fast(
    polynomial: sp.Poly,
) -> tuple[tuple[int, ...], dict[tuple[int, ...], Fraction]]:
    """The same tensor transform via one binomial transform per axis."""
    degrees = tuple(polynomial.degree(variable) for variable in polynomial.gens)
    tensor = {
        index: Fraction(0)
        for index in itertools.product(*(range(degree + 1) for degree in degrees))
    }
    for monomial, coefficient in polynomial.terms():
        value = Fraction(int(coefficient.p), int(coefficient.q))
        for exponent, degree in zip(monomial, degrees):
            value /= math.comb(degree, exponent)
        tensor[monomial] = value
    for dimension, degree in enumerate(degrees):
        other_dimensions = [index for index in range(len(degrees)) if index != dimension]
        transformed: dict[tuple[int, ...], Fraction] = {}
        for other_index in itertools.product(
            *(range(degrees[index] + 1) for index in other_dimensions)
        ):
            def full_index(position: int) -> tuple[int, ...]:
                out = [0] * len(degrees)
                out[dimension] = position
                for index, entry in zip(other_dimensions, other_index):
                    out[index] = entry
                return tuple(out)

            source = [tensor[full_index(position)] for position in range(degree + 1)]
            for target in range(degree + 1):
                transformed[full_index(target)] = sum(
                    (math.comb(target, source_index) * source[source_index]
                     for source_index in range(target + 1)),
                    Fraction(0),
                )
        tensor = transformed
    return degrees, tensor


def split_tensor(
    tensor: dict[tuple[int, ...], Fraction],
    degrees: tuple[int, ...],
    dimension: int,
) -> tuple[dict[tuple[int, ...], Fraction], dict[tuple[int, ...], Fraction]]:
    other_dimensions = [index for index in range(len(degrees)) if index != dimension]
    left: dict[tuple[int, ...], Fraction] = {}
    right: dict[tuple[int, ...], Fraction] = {}
    for other_index in itertools.product(
        *(range(degrees[index] + 1) for index in other_dimensions)
    ):
        def full_index(position: int) -> tuple[int, ...]:
            out = [0] * len(degrees)
            out[dimension] = position
            for index, value in zip(other_dimensions, other_index):
                out[index] = value
            return tuple(out)

        levels = [[tensor[full_index(position)] for position in range(degrees[dimension] + 1)]]
        for _ in range(degrees[dimension]):
            previous = levels[-1]
            levels.append(
                [(previous[index] + previous[index + 1]) / 2 for index in range(len(previous) - 1)]
            )
        for position in range(degrees[dimension] + 1):
            left[full_index(position)] = levels[position][0]
            right[full_index(position)] = levels[degrees[dimension] - position][position]
    return left, right


def adaptive_audit(polynomial: sp.Poly) -> dict[str, object]:
    degrees, initial = power_to_bernstein_fast(polynomial)
    stack = [(initial, 0, tuple((Fraction(0), Fraction(1)) for _ in degrees))]
    passed = splits = 0
    maximum_depth = 0
    smallest_pass_minimum: Fraction | None = None
    while stack:
        tensor, depth, bounds = stack.pop()
        maximum_depth = max(maximum_depth, depth)
        minimum_index, minimum = min(tensor.items(), key=lambda item: item[1])
        if minimum >= 0:
            passed += 1
            smallest_pass_minimum = (
                minimum if smallest_pass_minimum is None
                else min(smallest_pass_minimum, minimum)
            )
            continue
        corner_indices = itertools.product(*((0, degree) for degree in degrees))
        negative_corner = next(
            ((index, tensor[index]) for index in corner_indices if tensor[index] < 0),
            None,
        )
        if negative_corner is not None:
            return {
                "status": "FAIL_ACTUAL_NEGATIVE_SUBBOX_VERTEX",
                "degrees": list(degrees),
                "negative_vertex_index": list(negative_corner[0]),
                "negative_vertex_value": str(negative_corner[1]),
                "bounds": [[str(left), str(right)] for left, right in bounds],
                "passed_boxes": passed,
                "split_boxes": splits,
                "maximum_depth": maximum_depth,
            }
        if depth >= MAX_DEPTH or splits >= MAX_BOXES:
            return {
                "status": "OPEN_SUBDIVISION_LIMIT",
                "degrees": list(degrees),
                "minimum_index": list(minimum_index),
                "minimum": str(minimum),
                "bounds": [[str(left), str(right)] for left, right in bounds],
                "passed_boxes": passed,
                "split_boxes": splits,
                "maximum_depth": maximum_depth,
            }
        candidates = [
            index for index, degree in enumerate(degrees)
            if 0 < minimum_index[index] < degree
        ]
        assert candidates
        dimension = max(
            candidates,
            key=lambda index: (
                min(minimum_index[index], degrees[index] - minimum_index[index])
                / degrees[index],
                degrees[index],
            ),
        )
        left_tensor, right_tensor = split_tensor(tensor, degrees, dimension)
        midpoint = (bounds[dimension][0] + bounds[dimension][1]) / 2
        left_bounds = list(bounds)
        right_bounds = list(bounds)
        left_bounds[dimension] = (bounds[dimension][0], midpoint)
        right_bounds[dimension] = (midpoint, bounds[dimension][1])
        stack.append((right_tensor, depth + 1, tuple(right_bounds)))
        stack.append((left_tensor, depth + 1, tuple(left_bounds)))
        splits += 1
    return {
        "status": "PASS_EXACT_ADAPTIVE_BERNSTEIN_SUBDIVISION",
        "degrees": list(degrees),
        "passed_boxes": passed,
        "split_boxes": splits,
        "maximum_depth": maximum_depth,
        "smallest_pass_minimum": str(smallest_pass_minimum),
    }


def main() -> None:
    numerator, _ = corner.new_leaf_corner(1, 3)
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    rows = []
    for order in (26, 27, 30, 35, 40):
        N = sp.Integer(order)
        x_bound = sp.cancel(6 * N / (N**2 - 15 * N + 10))
        y_bound = sp.cancel(5 * N / (N**2 - 12 * N + 8))
        x_lower = sp.cancel(6 / (N - 5))
        y_lower = sp.cancel(5 / (N - 4))
        x_ratio = x_lower + (x_bound - x_lower) * X
        y_ratio = y_lower + (y_bound - y_lower) * Y
        k4 = sp.cancel(4 / ((N - 4) * y_bound))
        k6 = sp.cancel((N - 5) * x_bound / 6)
        minimum_F_order = N - 12
        mu4_lower_F = sp.cancel(minimum_F_order - 12 + 8 / minimum_F_order)
        l4 = sp.cancel((N - 4) / mu4_lower_F)
        u4_break = sp.cancel((1 - k4) / (l4 - k4))
        u6_break = sp.cancel(1 / k6)
        assert 0 < u4_break < u6_break < 1
        region_specs = (
            ("low_u5", sp.Integer(0), u4_break, "ratio", "coupled"),
            ("middle_u5", u4_break, u6_break, "missing", "coupled"),
            ("high_u5", u6_break, sp.Integer(1), "missing", "free"),
        )
        for region, lower_u5, upper_u5, u4_mode, u6_mode in region_specs:
            u5 = lower_u5 + (upper_u5 - lower_u5) * S
            u6 = k6 * u5 * V6 if u6_mode == "coupled" else V6
            u4_upper = (
                l4 * u5 if u4_mode == "ratio"
                else 1 - k4 * (1 - u5)
            )
            u4 = u4_upper * V4
            normalized = sp.expand(
                numerator.subs(
                    {
                        corner.leaf.d[6]: 1,
                        corner.leaf.d[5]: x_ratio,
                        corner.leaf.d[4]: x_ratio * y_ratio,
                        corner.leaf.f[6]: u6,
                        corner.leaf.f[5]: x_ratio * u5,
                        corner.leaf.f[4]: x_ratio * y_ratio * u4,
                    },
                    simultaneous=True,
                )
            )
            polynomial = sp.Poly(normalized, X, Y, S, V4, V6, domain=sp.QQ)
            result = adaptive_audit(polynomial)
            row = {
                "order_N": order,
                "region": region,
                "d5_over_d6_interval": [str(x_lower), str(x_bound)],
                "d4_over_d5_interval": [str(y_lower), str(y_bound)],
                "degree_cap": 12,
                "minimum_F_order": int(minimum_F_order),
                "u5_interval": [str(lower_u5), str(upper_u5)],
                "u4_mode": u4_mode,
                "u6_mode": u6_mode,
                "power_terms": len(polynomial.terms()),
                "result": result,
            }
            rows.append(row)
            print(
                "N", order, "REGION", region, result["status"],
                "SPLITS", result.get("split_boxes"),
                "DEPTH", result.get("maximum_depth"), flush=True,
            )
    payload = {
        "schema": "rank8-delta1-mask3-shadow-adaptive-subdivision-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "rows": rows,
        "limits": {"maximum_depth": MAX_DEPTH, "maximum_split_boxes": MAX_BOXES},
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
