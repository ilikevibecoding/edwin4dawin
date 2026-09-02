#!/usr/bin/env python3
"""Certify a cached direct isolate-payment Bernstein slice."""

from __future__ import annotations

import argparse
import math
import pickle
from collections import deque
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution
from scipy.special import comb

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank5_isolate_payment_direct import derivative_coefficients
from verify_rank5_isolate_payment_monotonicity import (
    remove_nonnegative_monomial_factor,
)


def remove_axis(items, axis):
    return tuple(item for index, item in enumerate(items) if index != axis)


def first_negative_with_index(coefficients):
    for flat_index, value in enumerate(coefficients.flat):
        if value.is_negative:
            return (
                value,
                np.unravel_index(flat_index, coefficients.shape),
            )
    return None


def bernstein_to_power_axis(coefficients, axis):
    moved = np.moveaxis(coefficients, axis, 0)
    degree = moved.shape[0] - 1
    power = np.empty_like(moved)
    for exponent in range(degree + 1):
        value = moved[exponent].copy()
        for lower in range(exponent):
            value -= power[lower] * sp.Rational(
                math.comb(exponent, lower),
                math.comb(degree, lower),
            )
        power[exponent] = value * math.comb(degree, exponent)
    return np.moveaxis(power, 0, axis)


def power_to_bernstein_axis(coefficients, axis):
    moved = np.moveaxis(coefficients, axis, 0)
    degree = moved.shape[0] - 1
    bernstein = np.empty_like(moved)
    for index in range(degree + 1):
        value = np.empty(moved.shape[1:], dtype=object)
        value.fill(sp.S.Zero)
        for exponent in range(index + 1):
            value += moved[exponent] * sp.Rational(
                math.comb(index, exponent),
                math.comb(degree, exponent),
            )
        bernstein[index] = value
    return np.moveaxis(bernstein, 0, axis)


def remove_slice_monomial_factor(coefficients):
    power = coefficients
    for axis in range(coefficients.ndim):
        power = bernstein_to_power_axis(power, axis)
    nonzero = np.argwhere(
        np.vectorize(lambda value: value != 0)(power)
    )
    assert nonzero.size
    exponents = tuple(int(value) for value in nonzero.min(axis=0))
    slices = tuple(slice(exponent, None) for exponent in exponents)
    power = power[slices]
    bernstein = power
    for axis in range(power.ndim):
        bernstein = power_to_bernstein_axis(bernstein, axis)
    return bernstein, exponents


def bernstein_expression(coefficients, names):
    power = coefficients
    for axis in range(coefficients.ndim):
        power = bernstein_to_power_axis(power, axis)
    variables = sp.symbols(" ".join(names), nonnegative=True)
    expression = sp.S.Zero
    for index in np.ndindex(power.shape):
        coefficient = power[index]
        if coefficient:
            expression += coefficient * sp.prod(
                variable**exponent
                for variable, exponent in zip(variables, index)
            )
    return sp.expand(expression), variables


def blow_up_corner(coefficients, names, first_name, second_name, prefix=""):
    expression, variables = bernstein_expression(coefficients, names)
    variable_map = dict(zip(names, variables))
    first = variable_map[first_name]
    second = variable_map[second_name]
    patches = []
    for label, substitution in (
        (
            f"{prefix}{first_name}_le_{second_name}",
            {first: second * first},
        ),
        (
            f"{prefix}{second_name}_le_{first_name}",
            {second: first * second},
        ),
    ):
        transformed = sp.expand(expression.subs(substitution))
        residual, factor = remove_nonnegative_monomial_factor(
            transformed, variables
        )
        degrees, array = tensor_bernstein_fast(residual, variables)
        patches.append((array, names, degrees, label))
        print(
            f"corner blow-up {label}: degrees={degrees} "
            f"monomial_factor={factor}",
            flush=True,
        )
    return patches


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("cache", type=Path)
    parser.add_argument("--maximum-depth", type=int, default=30)
    parser.add_argument("--optimize", action="store_true")
    parser.add_argument("--blowup", action="store_true")
    parser.add_argument("--inspect-blowup", action="store_true")
    parser.add_argument("--double-blowup", action="store_true")
    args = parser.parse_args()
    with args.cache.open("rb") as stream:
        data = pickle.load(stream)
    coefficients = data["coefficients"]
    degrees = tuple(data["degrees"])
    q_region = data["q_region"]
    names = ("X", "T", "A", "W", "V", "Z")

    # Exact global monotonic reductions already suggested by every
    # negative enclosure.
    t_axis = names.index("T")
    t_derivative = derivative_coefficients(coefficients, t_axis)
    t_minimum, t_index = minimum_with_index(t_derivative)
    assert t_minimum >= 0, (t_minimum, t_index)
    coefficients = np.take(coefficients, 0, axis=t_axis)
    degrees = remove_axis(degrees, t_axis)
    names = remove_axis(names, t_axis)

    a_axis = names.index("A")
    a_derivative = derivative_coefficients(coefficients, a_axis)
    a_at_zero = q_region == "q_half_high_r"
    if not a_at_zero:
        a_derivative = -a_derivative
    a_minimum, a_index = minimum_with_index(a_derivative)
    assert a_minimum >= 0, (a_minimum, a_index)
    a_endpoint = 0 if a_at_zero else degrees[a_axis]
    coefficients = np.take(coefficients, a_endpoint, axis=a_axis)
    degrees = remove_axis(degrees, a_axis)
    names = remove_axis(names, a_axis)
    coefficients, slice_factor = remove_slice_monomial_factor(
        coefficients
    )
    degrees = tuple(size - 1 for size in coefficients.shape)
    print(
        f"global reductions: T_min={t_minimum} A_min={a_minimum} "
        f"remaining={names} degrees={degrees} "
        f"slice_monomial_factor={slice_factor}",
        flush=True,
    )
    if args.optimize:
        floating = np.vectorize(float)(coefficients)

        def objective(point):
            value = floating
            for coordinate, degree in zip(point, degrees):
                basis = np.array(
                    [
                        comb(degree, index)
                        * coordinate**index
                        * (1 - coordinate) ** (degree - index)
                        for index in range(degree + 1)
                    ]
                )
                value = np.tensordot(basis, value, axes=(0, 0))
            return float(value)

        result = differential_evolution(
            objective,
            [(0, 1)] * len(degrees),
            seed=993,
            popsize=30,
            maxiter=1000,
            polish=True,
            tol=1e-11,
        )
        print(
            f"numerical minimum={result.fun} point={tuple(result.x)} "
            f"success={result.success}"
        )
        return 0

    if args.blowup and "W" in names and "V" in names:
        initial_patches = blow_up_corner(
            coefficients, names, "W", "V"
        )
    else:
        initial_patches = [(coefficients, names, degrees, "base")]
    if args.double_blowup:
        refined_patches = []
        for patch, patch_names, patch_degrees, label in initial_patches:
            if (
                first_negative_with_index(patch) is not None
                and "W" in patch_names
                and "Z" in patch_names
            ):
                refined_patches.extend(
                    blow_up_corner(
                        patch,
                        patch_names,
                        "W",
                        "Z",
                        prefix=f"{label}/",
                    )
                )
            else:
                refined_patches.append(
                    (patch, patch_names, patch_degrees, label)
                )
        initial_patches = refined_patches
    if args.inspect_blowup:
        for patch, patch_names, patch_degrees, label in initial_patches:
            current = patch
            current_names = patch_names
            current_degrees = patch_degrees
            for variable in ("V", "Z"):
                axis = current_names.index(variable)
                oriented = -derivative_coefficients(current, axis)
                negative = first_negative_with_index(oriented)
                print(
                    f"{label} oriented derivative {variable}: "
                    f"negative={negative}",
                    flush=True,
                )
                if negative is None:
                    current = np.take(
                        current, current_degrees[axis], axis=axis
                    )
                    current_names = remove_axis(current_names, axis)
                    current_degrees = remove_axis(current_degrees, axis)
            print(
                f"{label} reduced names={current_names} "
                f"degrees={current_degrees} "
                f"negative={first_negative_with_index(current)}",
                flush=True,
            )
            floating_patch = np.vectorize(float)(patch)

            def patch_objective(point):
                value = floating_patch
                for coordinate, degree in zip(point, patch_degrees):
                    basis = np.array(
                        [
                            comb(degree, index)
                            * coordinate**index
                            * (1 - coordinate)
                            ** (degree - index)
                            for index in range(degree + 1)
                        ]
                    )
                    value = np.tensordot(
                        basis, value, axes=(0, 0)
                    )
                return float(value)

            optimum = differential_evolution(
                patch_objective,
                [(0, 1)] * len(patch_degrees),
                seed=993,
                popsize=25,
                maxiter=500,
                polish=True,
                tol=1e-10,
            )
            print(
                f"{label} numerical_minimum={optimum.fun} "
                f"point={tuple(optimum.x)}",
                flush=True,
            )
        return 0
    queue = deque(
        (
            patch,
            patch_names,
            patch_degrees,
            tuple((sp.S.Zero, sp.S.One) for _ in patch_names),
            0,
            0,
        )
        for patch, patch_names, patch_degrees, _ in initial_patches
    )
    leaves = 0
    reductions = 0
    splits = 0
    maximum_depth = 0
    while queue:
        (
            patch,
            patch_names,
            patch_degrees,
            patch_bounds,
            depth,
            vz_turn,
        ) = queue.popleft()
        negative = first_negative_with_index(patch)
        if negative is None:
            leaves += 1
            maximum_depth = max(maximum_depth, depth)
            continue
        minimum, index = negative
        if depth >= args.maximum_depth:
            raise AssertionError(
                f"unresolved minimum={minimum} index={index} "
                f"names={patch_names} bounds={patch_bounds} "
                f"depth={depth}"
            )

        reduced = False
        for variable in ("V", "Z"):
            if variable not in patch_names:
                continue
            axis = patch_names.index(variable)
            oriented = -derivative_coefficients(patch, axis)
            oriented_negative = first_negative_with_index(oriented)
            if oriented_negative is None:
                upper = np.take(
                    patch, patch_degrees[axis], axis=axis
                )
                queue.appendleft(
                    (
                        upper,
                        remove_axis(patch_names, axis),
                        remove_axis(patch_degrees, axis),
                        remove_axis(patch_bounds, axis),
                        depth,
                        vz_turn,
                    )
                )
                reductions += 1
                reduced = True
                break
        if reduced:
            continue

        preferred_variables = [
            variable for variable in ("V", "Z", "W", "X")
            if variable in patch_names
        ]
        if preferred_variables:
            variable = preferred_variables[
                vz_turn % len(preferred_variables)
            ]
            axis = patch_names.index(variable)
            next_turn = vz_turn + 1
        else:
            interiorities = [
                (
                    min(position, degree - position) / degree
                    if degree
                    else 0
                )
                for position, degree in zip(index, patch_degrees)
            ]
            if max(interiorities) > 0:
                axis = max(
                    range(len(patch_degrees)),
                    key=interiorities.__getitem__,
                )
            else:
                axis = depth % len(patch_degrees)
            next_turn = vz_turn
        left, right = split_bernstein_midpoint(patch, axis)
        low, high = patch_bounds[axis]
        midpoint = (low + high) / 2
        left_bounds = list(patch_bounds)
        right_bounds = list(patch_bounds)
        left_bounds[axis] = (low, midpoint)
        right_bounds[axis] = (midpoint, high)
        queue.append(
            (
                left,
                patch_names,
                patch_degrees,
                tuple(left_bounds),
                depth + 1,
                next_turn,
            )
        )
        queue.append(
            (
                right,
                patch_names,
                patch_degrees,
                tuple(right_bounds),
                depth + 1,
                next_turn,
            )
        )
        splits += 1
        if splits % 1000 == 0:
            print(
                f"splits={splits} queue={len(queue)} "
                f"leaves={leaves} reductions={reductions} "
                f"depth={depth}",
                flush=True,
            )

    print(
        "cached direct slice: PASS "
        f"leaves={leaves} reductions={reductions} splits={splits} "
        f"maximum_depth={maximum_depth}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
