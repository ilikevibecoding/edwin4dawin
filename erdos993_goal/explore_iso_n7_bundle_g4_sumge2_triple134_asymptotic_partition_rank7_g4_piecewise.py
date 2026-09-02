#!/usr/bin/env python3
"""Find an exact box partition for the positive triple134 q=1 face."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction

import numpy as np
import sympy as sp

from explore_iso_n7_bundle_g4_sumge2_floor_or_bernstein_rank7_g4_piecewise import (
    build_polynomials,
)
from explore_iso_n7_bundle_g4_sumge2_or_axis_rank7_g4_piecewise import (
    split_axis_fast,
)


VARIABLES = ("a", "b", "c", "omega", "tau")
DEGREES = (4, 4, 3, 2, 1)
MAX_DEPTH = 16


def unit_bernstein_controls(polynomial):
    shape = tuple(degree + 1 for degree in DEGREES)
    controls = np.empty(shape, dtype=object)
    controls.fill(Fraction(0))
    for powers, coefficient in polynomial.terms():
        controls[powers] = Fraction(
            int(sp.numer(coefficient)), int(sp.denom(coefficient))
        )
    for axis, degree in enumerate(DEGREES):
        moved = np.moveaxis(controls, axis, 0)
        source = moved.reshape((degree + 1, -1))
        target = np.empty_like(source)
        for index in range(degree + 1):
            target[index] = sum(
                source[power]
                * Fraction(math.comb(index, power), math.comb(degree, power))
                for power in range(index + 1)
            )
        controls = np.moveaxis(target.reshape(moved.shape), 0, axis)
    scale = math.lcm(*(value.denominator for value in controls.flat))
    integers = np.empty(shape, dtype=object)
    stream = hashlib.sha256()
    for index in np.ndindex(shape):
        value = controls[index]
        integer = value.numerator * (scale // value.denominator)
        integers[index] = integer
        stream.update(f"{index}:{integer};".encode())
    return integers, scale, stream.hexdigest().upper()


def stats(array):
    values = [int(value) for value in array.flat]
    return min(values), sum(value < 0 for value in values)


def adaptive_partition(array, path=(), depth=0):
    minimum, negative = stats(array)
    if minimum >= 0:
        return [{"path": list(path), "minimum": str(minimum)}]
    if depth >= MAX_DEPTH:
        raise RuntimeError(f"open depth {depth}, path={path}, minimum={minimum}")
    trials = []
    for axis, variable in enumerate(VARIABLES):
        left, right = split_axis_fast(array, axis)
        left_stats, right_stats = stats(left), stats(right)
        score = (
            left_stats[1] + right_stats[1],
            max(left_stats[1], right_stats[1]),
            -sum(value >= 0 for value, _count in (left_stats, right_stats)),
            axis,
        )
        trials.append((score, axis, variable, left, right, left_stats, right_stats))
    chosen = min(trials, key=lambda item: item[0])
    _score, axis, variable, left, right, left_stats, right_stats = chosen
    print(
        "SPLIT", depth, "/".join(path) or "root", variable,
        "left", left_stats, "right", right_stats, flush=True,
    )
    return (
        adaptive_partition(left, (*path, f"{variable}L"), depth + 1)
        + adaptive_partition(right, (*path, f"{variable}R"), depth + 1)
    )


def main():
    polynomial = build_polynomials(
        endpoint_pairs=((0, 0),), floor_labels=("triple134",)
    )[(0, 0, "triple134")]
    r, a, b, c, omega, tau, _ea, _eb, _ez = polynomial.gens
    leading = sp.Poly(polynomial.as_expr(), r).coeff_monomial(r**11)
    leading_poly = sp.Poly(sp.expand(leading), a, b, c, omega, tau)
    assert tuple(leading_poly.degree_list()) == DEGREES
    controls, scale, digest = unit_bernstein_controls(leading_poly)
    leaves = adaptive_partition(controls)
    report = {
        "variables": list(VARIABLES),
        "degrees": list(DEGREES),
        "scale": scale,
        "control_digest": digest,
        "leaf_count": len(leaves),
        "maximum_depth": max(len(leaf["path"]) for leaf in leaves),
        "leaves": leaves,
    }
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
