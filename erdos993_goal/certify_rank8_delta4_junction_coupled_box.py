#!/usr/bin/env python3
"""Exact coupled lower-face certificate for the Delta4 root junction.

The shared junction is lower-zero Z=1 = lower-cross Z=0.  Unlike the failed
rectangular scaled enclosure, this box retains safe t-dependent lower bounds
for y=n*w and r=x/w.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from probe_rank8_delta4_source_curvatures import build


Y_HIGH = sp.Rational(759, 190)
R_HIGH = sp.Rational(760, 471)


def to_flint(context, expression, variables):
    poly = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
    data = {}
    for monomial, coefficient in poly.terms():
        numerator, denominator = sp.fraction(coefficient)
        data[monomial] = fmpq(int(numerator), int(denominator))
    return context.from_dict(data)


def tensor_bernstein_from_flint(poly, dimension: int):
    terms = list(poly.terms())
    degrees = tuple(
        max((monomial[axis] for monomial, _ in terms), default=0)
        for axis in range(dimension)
    )
    coefficients = np.empty(tuple(degree + 1 for degree in degrees), dtype=object)
    coefficients.fill(fmpq(0))
    for monomial, coefficient in terms:
        coefficients[monomial] = coefficient
    for axis, degree in enumerate(degrees):
        moved = np.moveaxis(coefficients, axis, 0)
        transformed = np.empty_like(moved)
        for index in range(degree + 1):
            value = np.empty(moved.shape[1:], dtype=object)
            value.fill(fmpq(0))
            for exponent in range(index + 1):
                value += moved[exponent] * fmpq(
                    math.comb(index, exponent), math.comb(degree, exponent)
                )
            transformed[index] = value
        coefficients = np.moveaxis(transformed, 0, axis)
    return degrees, coefficients, len(terms)


def minimum_with_index(coefficients):
    flat_index = min(range(coefficients.size), key=lambda index: coefficients.flat[index])
    return coefficients.flat[flat_index], np.unravel_index(flat_index, coefficients.shape)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    args = parser.parse_args()

    lower_zero, variables = build(args.k, "l0")
    lower_cross, cross_variables = build(args.k, "lcross")
    n, w, x, U, V, Z = variables
    assert tuple(map(str, variables)) == tuple(map(str, cross_variables))
    junction = sp.cancel(lower_zero.subs(Z, 1))
    assert sp.cancel(junction - lower_cross.subs(cross_variables[-1], 0)) == 0
    numerator, denominator = sp.fraction(junction)
    source = sp.Poly(sp.expand(numerator), n, w, x, U, V, domain=sp.QQ)
    source_terms = source.terms()
    t_shift = max(n_power - w_power - x_power for (
        n_power, w_power, x_power, _, _
    ), _ in source_terms)
    if t_shift < 0:
        t_shift = 0

    # First use n=1/t, w=y*t, x=y*t*r.  This produces a sparse polynomial
    # in t,y,r,U,V after multiplication by t**t_shift.
    base_data = {}
    for monomial, coefficient in source_terms:
        n_power, w_power, x_power, u_power, v_power = monomial
        key = (
            t_shift + w_power + x_power - n_power,
            w_power + x_power,
            x_power,
            u_power,
            v_power,
        )
        base_data[key] = base_data.get(key, sp.S.Zero) + coefficient
    base_data = {key: coefficient for key, coefficient in base_data.items() if coefficient}
    maxima = tuple(max(key[axis] for key in base_data) for axis in range(5))

    T, W, A, Uc, Vc = sp.symbols("T W A Uc Vc", nonnegative=True)
    cube = (T, W, A, Uc, Vc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])
    t_map = T / 23
    y_lower = 3 + 9 * T / 23
    y_upper = 3 + sp.Rational(4347, 190) * T / 23
    y_map = y_lower + (y_upper - y_lower) * W
    r_lower = sp.Rational(4, 3) + 2 * T / 69
    r_upper = sp.Rational(4, 3) + (R_HIGH - sp.Rational(4, 3)) * T
    r_map = r_lower + (r_upper - r_lower) * A
    maps = [
        to_flint(context, t_map, cube),
        to_flint(context, y_map, cube),
        to_flint(context, r_map, cube),
        to_flint(context, Uc, cube),
        to_flint(context, Vc, cube),
    ]
    powers = [
        [mapping ** power for power in range(maximum + 1)]
        for mapping, maximum in zip(maps, maxima)
    ]
    mapped = context.constant(0)
    for monomial, coefficient in base_data.items():
        coefficient_numerator, coefficient_denominator = sp.fraction(coefficient)
        term = context.constant(
            fmpq(int(coefficient_numerator), int(coefficient_denominator))
        )
        for axis, power in enumerate(monomial):
            term *= powers[axis][power]
        mapped += term

    degrees, bernstein, mapped_terms = tensor_bernstein_from_flint(mapped, len(cube))
    minimum, index = minimum_with_index(bernstein)
    negative_count = sum(bool(coefficient < 0) for coefficient in bernstein.flat)
    zero_count = sum(bool(coefficient == 0) for coefficient in bernstein.flat)
    positive_count = int(bernstein.size) - negative_count - zero_count
    status = "PASS" if negative_count == 0 else "COUPLED_ENCLOSURE_UNRESOLVED"
    print("MAPPED", degrees, bernstein.size, minimum, index, flush=True)

    payload = {
        "status": status,
        "scope": "exact Delta4>=0 on the shared lower-zero/lower-cross junction for all n>=23 if PASS; conditional on Q7(alpha>=12)",
        "D6_k": args.k,
        "junction_identity": "lower-zero Z=1 equals lower-cross Z=0",
        "positive_multiplier": f"t**{t_shift}",
        "coupled_enlarged_box": {
            "t": "T/23, 0<T<=1",
            "y_lower": "3+9t",
            "y_upper": "3+(4347/190)t",
            "r_lower": "4/3+2t/3",
            "r_upper": "4/3+23(760/471-4/3)t",
            "U_V": "[0,1]^2",
            "containment": [
                "y=nw>=3/(1-3t)>=3+9t",
                "r=x/w>=8/(6-w)>=4/3+2w/9>=4/3+2t/3",
                "exact y_high(t) is below the endpoint chord 3+(4347/190)t",
                "exact r_high(t) is below the endpoint chord 4/3+23(760/471-4/3)t",
            ],
        },
        "source_denominator_factor": str(sp.factor(denominator)),
        "source_numerator_terms": len(source_terms),
        "scaled_sparse_terms": len(base_data),
        "scaled_sparse_degrees": [int(entry) for entry in maxima],
        "mapped_numerator_terms": int(mapped_terms),
        "mapped_degrees": [int(entry) for entry in degrees],
        "bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": [int(entry) for entry in index],
        "coefficient_sign_counts": {
            "negative": negative_count,
            "zero": zero_count,
            "positive": positive_count,
        },
        "warning": "If unresolved, this is only a coupled-enclosure/Bernstein obstruction, not a negative value or tree counterexample.",
    }
    output = Path(__file__).with_name(
        f"rank8_delta4_junction_coupled_k{args.k}_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("RANK8_DELTA4_JUNCTION_COUPLED", args.k, status)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if status != "PASS":
        return 2
    print("PASS_EXACT_RANK8_DELTA4_JUNCTION_COUPLED_BOX")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
