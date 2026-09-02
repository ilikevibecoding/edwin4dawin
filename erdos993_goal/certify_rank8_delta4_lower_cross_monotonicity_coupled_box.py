#!/usr/bin/env python3
"""Exact coupled-box convexity/monotonicity test for Delta4 lower-cross paths."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from certify_rank8_delta4_junction_coupled_box import (
    minimum_with_index,
    tensor_bernstein_from_flint,
    to_flint,
)
from probe_rank8_delta4_source_curvatures import build


R_HIGH = sp.Rational(760, 471)


def certify_expression(expression, source_variables, cube, context, maps):
    n, w, x, U, V = source_variables
    numerator, denominator = sp.fraction(sp.cancel(expression))
    source = sp.Poly(sp.expand(numerator), n, w, x, U, V, domain=sp.QQ)
    source_terms = source.terms()
    t_shift = max(n_power - w_power - x_power for (
        n_power, w_power, x_power, _, _
    ), _ in source_terms)
    if t_shift < 0:
        t_shift = 0
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
    return {
        "status": "PASS" if negative_count == 0 else "UNRESOLVED",
        "positive_multiplier": f"t**{t_shift}",
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
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    args = parser.parse_args()

    value, (n, w, x, U, V, Z) = build(args.k, "lcross")
    curvature = sp.cancel(sp.diff(value, Z, 2))
    junction_slope = sp.cancel(sp.diff(value, Z).subs(Z, 0))

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

    convexity = certify_expression(curvature, (n, w, x, U, V), cube, context, maps)
    print("CONVEXITY", convexity["status"], convexity["minimum"], flush=True)
    junction_monotonicity = certify_expression(
        junction_slope, (n, w, x, U, V), cube, context, maps
    )
    print(
        "JUNCTION_SLOPE",
        junction_monotonicity["status"],
        junction_monotonicity["minimum"],
        flush=True,
    )
    status = (
        "PASS"
        if convexity["status"] == "PASS" and junction_monotonicity["status"] == "PASS"
        else "COUPLED_MONOTONICITY_UNRESOLVED"
    )
    payload = {
        "status": status,
        "scope": "exact Delta4 lower-cross closure for all n>=23 if PASS: convex in Z and nonnegative slope at the certified junction; conditional on Q7(alpha>=12)",
        "D6_k": args.k,
        "capacity_piece": "lower-cross-live",
        "junction_endpoint": f"rank8_delta4_junction_coupled_k{args.k}_exact_20260820.json",
        "coupled_enlarged_box": {
            "t": "T/23",
            "y": "[3+9t, 3+(4347/190)t]",
            "r": "[4/3+2t/3, 4/3+23(760/471-4/3)t]",
            "U_V": "[0,1]^2",
        },
        "convexity_certificate_d2_Delta4_dZ2": convexity,
        "junction_slope_certificate_d_Delta4_dZ_at_0": junction_monotonicity,
        "warning": "If unresolved, this is a method/enclosure obstruction only, not a negative Delta4 value or tree counterexample.",
    }
    output = Path(__file__).with_name(
        f"rank8_delta4_lower_cross_monotonicity_coupled_k{args.k}_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("RANK8_DELTA4_LOWER_CROSS_MONOTONICITY_COUPLED", args.k, status)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if status != "PASS":
        return 2
    print("PASS_EXACT_RANK8_DELTA4_LOWER_CROSS_MONOTONICITY_COUPLED_BOX")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
