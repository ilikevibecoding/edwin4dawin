"""Test an exact affine Bernstein multiplier on the current unresolved cell.

This is an exploratory companion to the second-stage circle certificate.  It
replays the dyadic address stored in the primary report and asks whether

    W - lambda(y) N >= 0

has nonnegative Bernstein controls on that cell for an affine function of the
five local unit coordinates y.  Floating-point linear programming is used only
to propose coefficients; every accepted proposal is replayed with Fractions.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import re
from fractions import Fraction
from pathlib import Path

import numpy as np
from scipy.optimize import linprog

from certify_pf_length3_repeated_positive_root_orientation import (
    elevate_tensor_to_shape,
)
from certify_pf_length3_uniform_inner_orientation import midpoint_split_exact
from certify_window_one_prior_factor_circle_schur_boundary import (
    DEFAULT_OUTPUT,
    build_polynomials,
    controls_for,
)


def scaled_float(value: int, exponent: int) -> float:
    if value == 0:
        return 0.0
    magnitude = abs(value)
    shift = max(0, magnitude.bit_length() - 53)
    answer = math.ldexp(float(magnitude >> shift), shift - exponent)
    return -answer if value < 0 else answer


def coordinate_product(array: np.ndarray, axis: int) -> np.ndarray:
    """Bernstein controls for (degree(axis)+1)*y_axis*array."""

    moved = np.moveaxis(array, axis, 0)
    result = np.zeros((moved.shape[0] + 1,) + moved.shape[1:], dtype=object)
    for index in range(1, result.shape[0]):
        result[index] = index * moved[index - 1]
    return np.moveaxis(result, 0, axis)


def exact_verify(target: np.ndarray, bases: list[np.ndarray], values) -> bool:
    fractions = tuple(Fraction(value) for value in values)
    common = math.lcm(*(value.denominator for value in fractions))
    integers = [value.numerator * (common // value.denominator) for value in fractions]
    for index in np.ndindex(target.shape):
        remainder = common * int(target[index])
        remainder -= sum(coefficient * int(base[index]) for coefficient, base in zip(integers, bases))
        if remainder < 0:
            return False
    return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int)
    parser.add_argument("--degree", type=int, choices=(1, 2, 3, 4), default=1)
    args = parser.parse_args()
    report = json.loads(Path(DEFAULT_OUTPUT).read_text(encoding="utf-8"))
    address = report["unresolved"]["address"]
    projected, _ = build_polynomials()
    arrays = {name: controls_for(projected[name])[0] for name in ("N", "W")}
    common_shape = tuple(max(x, y) for x, y in zip(arrays["N"].shape, arrays["W"].shape))
    arrays = {
        name: elevate_tensor_to_shape(array, common_shape, exact=True)
        for name, array in arrays.items()
    }
    directions = re.findall(r"([0-4])([LR])", address)
    if args.steps is not None:
        directions = directions[: args.steps]
    for axis_text, side in directions:
        axis = int(axis_text)
        for name in arrays:
            left, right = midpoint_split_exact(arrays[name], axis)
            arrays[name] = left if side == "L" else right

    target_shape = tuple(size + args.degree for size in common_shape)
    target = elevate_tensor_to_shape(arrays["W"], target_shape, exact=True)
    bases = [elevate_tensor_to_shape(arrays["N"], target_shape, exact=True)]
    basis_names = ["1"]
    for axis in range(5):
        bases.append(
            elevate_tensor_to_shape(
                coordinate_product(arrays["N"], axis), target_shape, exact=True
            )
        )
        basis_names.append(f"y{axis}")
    for monomial_degree in range(2, args.degree + 1):
        for axes in itertools.combinations_with_replacement(range(5), monomial_degree):
            product = arrays["N"]
            for axis in axes:
                product = coordinate_product(product, axis)
            bases.append(elevate_tensor_to_shape(product, target_shape, exact=True))
            basis_names.append("*".join(f"y{axis}" for axis in axes))

    rows = list(zip(target.flat, *(base.flat for base in bases)))
    matrix = np.empty((len(rows), len(bases) + 1), dtype=float)
    rhs = np.empty(len(rows), dtype=float)
    for row_index, row in enumerate(rows):
        integers = tuple(map(int, row))
        exponent = max(max(abs(value).bit_length() for value in integers), 1)
        rhs[row_index] = scaled_float(integers[0], exponent)
        matrix[row_index, :-1] = [scaled_float(value, exponent) for value in integers[1:]]
        matrix[row_index, -1] = 1.0
    proposal = linprog(
        c=np.array([0.0] * len(bases) + [-1.0]),
        A_ub=matrix,
        b_ub=rhs,
        bounds=[(None, None)] * (len(bases) + 1),
        method="highs",
        options={"presolve": True},
    )
    print({"success": proposal.success, "message": proposal.message})
    if not proposal.success:
        return
    print({"slack": proposal.x[-1], "basis": basis_names, "lambda": proposal.x[:-1].tolist()})
    candidates = (
        tuple(Fraction(float(value)) for value in proposal.x[:-1]),
        tuple(Fraction(str(float(value))) for value in proposal.x[:-1]),
    )
    for candidate in candidates:
        passed = exact_verify(target, bases, candidate)
        print({"exact": passed, "lambda": [str(value) for value in candidate]})


if __name__ == "__main__":
    main()
