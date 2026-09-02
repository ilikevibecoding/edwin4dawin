#!/usr/bin/env python3
"""Exact coupled-box monotonicity certificate for Delta4 lower-cross paths."""

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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    args = parser.parse_args()

    value, (n, w, x, U, V, Z) = build(args.k, "lcross")
    derivative = sp.cancel(sp.diff(value, Z))
    numerator, denominator = sp.fraction(derivative)
    source = sp.Poly(sp.expand(numerator), n, w, x, U, V, Z, domain=sp.QQ)
    source_terms = source.terms()
    t_shift = max(n_power - w_power - x_power for (
        n_power, w_power, x_power, _, _, _
    ), _ in source_terms)
    if t_shift < 0:
        t_shift = 0
    base_data = {}
    for monomial, coefficient in source_terms:
        n_power, w_power, x_power, u_power, v_power, z_power = monomial
        key = (
            t_shift + w_power + x_power - n_power,
            w_power + x_power,
            x_power,
            u_power,
            v_power,
            z_power,
        )
        base_data[key] = base_data.get(key, sp.S.Zero) + coefficient
    base_data = {key: coefficient for key, coefficient in base_data.items() if coefficient}
    maxima = tuple(max(key[axis] for key in base_data) for axis in range(6))

    T, W, A, Uc, Vc, Zc = sp.symbols("T W A Uc Vc Zc", nonnegative=True)
    cube = (T, W, A, Uc, Vc, Zc)
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
        to_flint(context, Zc, cube),
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
    status = "PASS" if negative_count == 0 else "COUPLED_DERIVATIVE_UNRESOLVED"
    print("MAPPED", degrees, bernstein.size, minimum, index, flush=True)

    payload = {
        "status": status,
        "scope": "exact d Delta4/dZ>=0 throughout the lower-cross path for all n>=23 if PASS; with the certified junction this closes the branch conditional on Q7(alpha>=12)",
        "D6_k": args.k,
        "capacity_piece": "lower-cross-live",
        "certified_polynomial": "d Delta4/dZ",
        "junction_endpoint": f"rank8_delta4_junction_coupled_k{args.k}_exact_20260820.json",
        "positive_multiplier": f"t**{t_shift}",
        "coupled_enlarged_box": {
            "t": "T/23",
            "y": "[3+9t, 3+(4347/190)t]",
            "r": "[4/3+2t/3, 4/3+23(760/471-4/3)t]",
            "U_V_Z": "[0,1]^3",
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
        "warning": "If unresolved, this is a derivative-enclosure obstruction only, not a negative Delta4 value or tree counterexample.",
    }
    output = Path(__file__).with_name(
        f"rank8_delta4_lower_cross_derivative_coupled_k{args.k}_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("RANK8_DELTA4_LOWER_CROSS_DERIVATIVE_COUPLED", args.k, status)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if status != "PASS":
        return 2
    print("PASS_EXACT_RANK8_DELTA4_LOWER_CROSS_DERIVATIVE_COUPLED_BOX")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
