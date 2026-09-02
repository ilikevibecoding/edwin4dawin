#!/usr/bin/env python3
"""Fast exact tensor-Bernstein probe for the general adjacent double-star g1 face.

The older direct routine recomputes every multivariate Bernstein coefficient
from every power monomial.  This implementation performs five separable
one-dimensional transforms and then inverts them exactly.  It is exploratory:
it prints failures and never emits a theorem marker or a report.
"""

from __future__ import annotations

import itertools
import os

import sympy as sp

from analyze_iso_n6_bundle_g1_adjacent_double_star_actual_d_profile_g1_nonadjacent import build


def transform_axis(values, degrees, axis):
    degree = degrees[axis]
    grouped = {}
    for index, value in values.items():
        key = index[:axis] + index[axis + 1 :]
        grouped.setdefault(key, {})[index[axis]] = value
    answer = {}
    for key, source in grouped.items():
        for location in range(degree + 1):
            value = sum(
                source.get(exponent, 0)
                * sp.binomial(location, exponent)
                / sp.binomial(degree, exponent)
                for exponent in range(location + 1)
            )
            index = key[:axis] + (location,) + key[axis:]
            answer[index] = sp.expand(value)
    return answer


def invert_axis(values, degrees, axis):
    degree = degrees[axis]
    grouped = {}
    for index, value in values.items():
        key = index[:axis] + index[axis + 1 :]
        grouped.setdefault(key, {})[index[axis]] = value
    answer = {}
    for key, source in grouped.items():
        for exponent in range(degree + 1):
            value = sp.binomial(degree, exponent) * sum(
                (-1) ** (exponent - location)
                * sp.binomial(exponent, location)
                * source[location]
                for location in range(exponent + 1)
            )
            index = key[:axis] + (exponent,) + key[axis:]
            answer[index] = sp.expand(value)
    return answer


def main():
    case = os.environ.get("G1_KEEP_CASE", "00")
    value, all_variables = build(int(case[0]), int(case[1]))
    tail, *variables = all_variables
    polynomial = sp.Poly(value, *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    original = {index: sp.expand(coefficient) for index, coefficient in polynomial.terms()}
    values = dict(original)
    for axis in range(len(variables)):
        values = transform_axis(values, degrees, axis)
        print("FORWARD_AXIS", axis, str(variables[axis]), "ROWS", len(values), flush=True)
    negative = []
    minimum = None
    scalars = 0
    for index in sorted(values):
        coefficients = sp.Poly(values[index], tail).all_coeffs()
        scalars += len(coefficients)
        local = min(coefficients)
        minimum = local if minimum is None else min(minimum, local)
        if any(coefficient < 0 for coefficient in coefficients):
            negative.append((index, sp.factor(values[index]), coefficients))
    recovered = dict(values)
    for axis in reversed(range(len(variables))):
        recovered = invert_axis(recovered, degrees, axis)
        print("INVERSE_AXIS", axis, str(variables[axis]), "ROWS", len(recovered), flush=True)
    full_indices = itertools.product(*(range(degree + 1) for degree in degrees))
    assert all(
        sp.expand(recovered[index] - original.get(index, 0)) == 0
        for index in full_indices
    )
    print("CASE", case)
    print("VARIABLES", list(map(str, variables)))
    print("DEGREES", degrees)
    print("POWER_TERMS", len(original))
    print("BERNSTEIN_ROWS", len(values), "TAIL_SCALARS", scalars)
    print("MINIMUM", minimum, "NEGATIVE_ROWS", len(negative))
    print("FIRST_NEGATIVE", negative[:1])
    print("PROBE_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_DOUBLE_STAR_FAST_BERNSTEIN_G1_NONADJACENT")


if __name__ == "__main__":
    main()
