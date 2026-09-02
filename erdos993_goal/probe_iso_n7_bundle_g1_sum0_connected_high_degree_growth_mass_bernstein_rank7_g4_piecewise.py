#!/usr/bin/env python3
"""Exact Bernstein probe for all-order positivity of mass growth kernels."""

from __future__ import annotations

import argparse
import math
from collections import defaultdict

import sympy as sp

from analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_kernel_rank7_g4_piecewise import (
    d,
    growth_differences,
    mass_triple_kernel,
    n,
    w,
    y,
    z,
)


U, V, W, A, R = sp.symbols("U V W A R", nonnegative=True)


def cube_bernstein_coefficients(poly):
    variables = (U, V, W, A, R)
    exact = sp.Poly(sp.expand(poly), *variables, domain=sp.QQ)
    terms = exact.terms()
    degrees = tuple(exact.degree(variable) for variable in (U, V, W))
    result = defaultdict(lambda: sp.Integer(0))
    for powers, coefficient in terms:
        cube = powers[:3]
        orthant = powers[3:]
        ranges = [range(power, degree+1) for power, degree in zip(cube, degrees)]
        for i in ranges[0]:
            left = sp.Rational(math.comb(i, cube[0]), math.comb(degrees[0], cube[0]))
            for j in ranges[1]:
                middle = sp.Rational(math.comb(j, cube[1]), math.comb(degrees[1], cube[1]))
                for k in ranges[2]:
                    right = sp.Rational(math.comb(k, cube[2]), math.comb(degrees[2], cube[2]))
                    result[(i, j, k)+orthant] += coefficient*left*middle*right
    return degrees, result


def summarize(poly):
    degrees, controls = cube_bernstein_coefficients(poly)
    negatives = [(value, key) for key, value in controls.items() if value < 0]
    zeros = sum(value == 0 for value in controls.values())
    return {
        "degrees": degrees,
        "controls": len(controls),
        "negative": len(negatives),
        "minimum_negative": min(negatives) if negatives else None,
        "minimum": min((value, key) for key, value in controls.items()),
        "explicit_zeros": zeros,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--controls", default="6")
    args = parser.parse_args()
    selected = [int(value) for value in args.controls.split(",")]
    differences = growth_differences()
    for index in selected:
        kernel = mass_triple_kernel(differences[index])
        numerator, denominator = sp.cancel(kernel).as_numer_denom()
        assert sp.factor(denominator).subs(n, 40) > 0
        total_negatives = 0
        total_controls = 0
        global_minimum = None
        for maximum_excess in range(31):
            substitution = {
                n: 40+R,
                d: 4+maximum_excess,
                y: 1+(maximum_excess+2)*U,
                z: 1+(maximum_excess+2)*V,
                w: 1+(maximum_excess+2)*W,
            }
            summary = summarize(numerator.subs(substitution))
            total_negatives += summary["negative"]
            total_controls += summary["controls"]
            candidate = (summary["minimum"][0], "finite", maximum_excess,
                         summary["minimum"][1])
            global_minimum = candidate if global_minimum is None else min(global_minimum, candidate)
            if summary["negative"]:
                print("CONTROL", index, "FINITE_MAX_EXCESS", maximum_excess,
                      "SUMMARY", summary)
        tail_substitution = {
            n: 40+A+R,
            d: 35+A,
            y: 1+(33+A)*U,
            z: 1+(33+A)*V,
            w: 1+(33+A)*W,
        }
        tail = summarize(numerator.subs(tail_substitution))
        total_negatives += tail["negative"]
        total_controls += tail["controls"]
        candidate = (tail["minimum"][0], "tail", tail["minimum"][1])
        global_minimum = min(global_minimum, candidate)
        if tail["negative"]:
            print("CONTROL", index, "TAIL", tail)
        print("CONTROL", index, "TOTAL_CONTROLS", total_controls,
              "TOTAL_NEGATIVES", total_negatives,
              "GLOBAL_MINIMUM", global_minimum)


if __name__ == "__main__":
    main()
