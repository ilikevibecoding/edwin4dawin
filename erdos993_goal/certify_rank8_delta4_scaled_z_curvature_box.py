#!/usr/bin/env python3
"""Exact scaled-box curvature test in the lower-zero parameter Z."""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from probe_rank8_delta4_source_curvatures import build


T_MAX = sp.Rational(1, 23)
Y_LOW = sp.Rational(3)
Y_HIGH = sp.Rational(759, 190)
R_LOW = sp.Rational(4, 3)
R_HIGH = sp.Rational(760, 471)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    args = parser.parse_args()

    value, (n, w, x, U, V, Z) = build(args.k, "l0")
    curvature = sp.cancel(sp.diff(value, Z, 2))
    numerator, denominator = sp.fraction(curvature)
    source = sp.Poly(sp.expand(numerator), n, w, x, U, V, domain=sp.QQ)
    source_terms = source.terms()
    t_shift = max(n_power - w_power - x_power for (
        n_power, w_power, x_power, _, _
    ), _ in source_terms)
    if t_shift < 0:
        t_shift = 0

    T, Y, R = sp.symbols("T Y R", nonnegative=True)
    variables = (T, Y, R, U, V)
    y_step = Y_HIGH - Y_LOW
    r_step = R_HIGH - R_LOW
    mapped = collections.defaultdict(lambda: sp.S.Zero)
    for monomial, source_coefficient in source_terms:
        n_power, w_power, x_power, u_power, v_power = monomial
        t_power = t_shift + w_power + x_power - n_power
        y_power = w_power + x_power
        common = source_coefficient * T_MAX ** t_power
        for mapped_y_power in range(y_power + 1):
            y_coefficient = (
                sp.Integer(math.comb(y_power, mapped_y_power))
                * Y_LOW ** (y_power - mapped_y_power)
                * y_step ** mapped_y_power
            )
            for mapped_r_power in range(x_power + 1):
                r_coefficient = (
                    sp.Integer(math.comb(x_power, mapped_r_power))
                    * R_LOW ** (x_power - mapped_r_power)
                    * r_step ** mapped_r_power
                )
                key = (t_power, mapped_y_power, mapped_r_power, u_power, v_power)
                mapped[key] += common * y_coefficient * r_coefficient

    mapped_poly = sp.Poly.from_dict(
        {key: coefficient for key, coefficient in mapped.items() if coefficient},
        variables,
        domain=sp.QQ,
    )
    degrees, bernstein = tensor_bernstein_fast(mapped_poly.as_expr(), variables)
    minimum, minimum_index = minimum_with_index(bernstein)
    maximum_index = max(range(bernstein.size), key=lambda index: bernstein.flat[index])
    maximum = bernstein.flat[maximum_index]
    maximum_multi_index = tuple(int(entry) for entry in np.unravel_index(maximum_index, bernstein.shape))
    flat = list(bernstein.flat)
    negative_count = sum(bool(coefficient < 0) for coefficient in flat)
    zero_count = sum(bool(coefficient == 0) for coefficient in flat)
    positive_count = len(flat) - negative_count - zero_count
    if positive_count == 0:
        status = "PASS_CONCAVE"
    elif negative_count == 0:
        status = "PASS_CONVEX"
    else:
        status = "MIXED_BERNSTEIN_UNRESOLVED"
    print("MAPPED", degrees, bernstein.size, minimum, minimum_index, maximum, maximum_multi_index)

    payload = {
        "status": status,
        "scope": "exact sign of d2 Delta4/dZ2 on the scaled enlarged box if PASS; not a Delta4 sign theorem by itself",
        "D6_k": args.k,
        "capacity_piece": "lower-zero",
        "positive_multiplier": f"t**{t_shift}",
        "enlarged_box": {
            "t": "0 < t <= 1/23",
            "y": "3 <= y <= 759/190",
            "r": "4/3 <= r <= 760/471",
            "U_V": "[0,1]^2",
        },
        "source_denominator_factor": str(sp.factor(denominator)),
        "source_numerator_terms": len(source_terms),
        "mapped_numerator_terms": len(mapped_poly.terms()),
        "mapped_degrees": list(degrees),
        "bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": [int(entry) for entry in minimum_index],
        "maximum": str(maximum),
        "maximum_index": list(maximum_multi_index),
        "coefficient_sign_counts": {
            "negative": negative_count,
            "zero": zero_count,
            "positive": positive_count,
        },
        "warning": "Mixed coefficients are only an enclosure obstruction; no value or tree counterexample is asserted.",
    }
    output = Path(__file__).with_name(
        f"rank8_delta4_scaled_z_curvature_k{args.k}_l0_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("RANK8_DELTA4_SCALED_Z_CURVATURE", args.k, status)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if not status.startswith("PASS"):
        return 2
    print("PASS_EXACT_RANK8_DELTA4_SCALED_Z_CURVATURE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
