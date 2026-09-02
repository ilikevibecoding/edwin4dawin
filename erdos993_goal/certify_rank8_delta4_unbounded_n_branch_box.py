#!/usr/bin/env python3
"""Exact low-memory Delta4 branch sign test using an unbounded-order box.

After n=23+N, N>=0, each coefficient of the numerator in the power basis
of N is certified separately on a simple enlarged (w,x/w) rectangle.  A PASS
therefore proves the selected branch for every n>=23.  A failure is only a
failure of this enlarged enclosure/power-coefficient method.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from probe_rank8_delta4_source_curvatures import build


R_LOW = sp.Rational(4, 3)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    parser.add_argument("--piece", choices=("l0", "lcross", "ucap"), required=True)
    parser.add_argument("--order", type=int, default=23)
    args = parser.parse_args()
    if args.order < 23:
        raise ValueError("order threshold must be at least 23")
    threshold = sp.Integer(args.order)
    w_max = sp.factor(3 * (threshold - 1) / ((threshold - 3) * (threshold - 4)))
    ratio_high = sp.factor(4 / (3 * (1 - w_max)))

    value, (n, w, x, U, V, Z) = build(args.k, args.piece)
    numerator, denominator = sp.fraction(sp.cancel(value))
    denominator_factor = sp.factor(denominator)

    N, W, A = sp.symbols("N W A", nonnegative=True)
    bounded_variables = (W, A, U, V, Z)
    ratio_step = ratio_high - R_LOW

    # Expand the source monomials directly.  This avoids the very expensive
    # generic expand after the rational cone substitution.
    source = sp.Poly(sp.expand(numerator), n, w, x, U, V, Z, domain=sp.QQ)
    degree_n = source.degree(n)
    mapped_by_n_power = [collections.defaultdict(lambda: sp.S.Zero) for _ in range(degree_n + 1)]
    for monomial, source_coefficient in source.terms():
        n_power, w_power, x_power, u_power, v_power, z_power = monomial
        common = source_coefficient * w_max ** (w_power + x_power)
        for target_n_power in range(n_power + 1):
            n_coefficient = (
                sp.Integer(math.comb(n_power, target_n_power))
                * threshold ** (n_power - target_n_power)
            )
            for a_power in range(x_power + 1):
                ratio_coefficient = (
                    sp.Integer(math.comb(x_power, a_power))
                    * R_LOW ** (x_power - a_power)
                    * ratio_step ** a_power
                )
                key = (w_power + x_power, a_power, u_power, v_power, z_power)
                mapped_by_n_power[target_n_power][key] += (
                    common * n_coefficient * ratio_coefficient
                )
    coefficient_payloads = []
    overall_pass = True
    for power in range(degree_n + 1):
        coefficient = sp.Poly.from_dict(
            {key: value for key, value in mapped_by_n_power[power].items() if value},
            bounded_variables,
            domain=sp.QQ,
        )
        degrees, bernstein = tensor_bernstein_fast(coefficient.as_expr(), bounded_variables)
        minimum, index = minimum_with_index(bernstein)
        passed = minimum >= 0
        overall_pass = overall_pass and passed
        coefficient_payloads.append(
            {
                "N_power": power,
                "source_terms": len(coefficient.terms()),
                "degrees": list(degrees),
                "bernstein_coefficients": int(bernstein.size),
                "minimum": str(minimum),
                "minimum_index": [int(entry) for entry in index],
                "status": "PASS" if passed else "ENCLOSURE_UNRESOLVED",
            }
        )
        print("N_POWER", power, degrees, bernstein.size, minimum, index, flush=True)

    status = "PASS" if overall_pass else "ENCLOSURE_UNRESOLVED"
    payload = {
        "status": status,
        "scope": "exact Delta4>=0 for selected branch and D6 endpoint for all n>=23 if PASS; conditional on Q7(alpha>=12) c8 endpoint",
        "D6_k": args.k,
        "capacity_piece": args.piece,
        "order_parameter": f"n={args.order}+N, N>=0; every N-power coefficient certified separately",
        "enlarged_box": {
            "w": f"0 < w <= {w_max}",
            "x_over_w": f"4/3 <= x/w <= {ratio_high}",
            "U_V_Z": "[0,1]^3",
            "contains_n_ge_23_cone": True,
        },
        "source_denominator_factor": str(denominator_factor),
        "N_degree": degree_n,
        "coefficient_certificates": coefficient_payloads,
        "warning": (
            "A negative Bernstein coefficient or N-power coefficient is only an enlarged-enclosure "
            "obstruction, not a negative Delta4 value or tree counterexample."
        ),
    }
    output = Path(__file__).with_name(
        f"rank8_delta4_unbounded_n{args.order}_k{args.k}_{args.piece}_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("RANK8_DELTA4_UNBOUNDED_N_BRANCH", args.k, args.piece, status)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if not overall_pass:
        return 2
    print("PASS_EXACT_RANK8_DELTA4_UNBOUNDED_N_BRANCH_ENLARGED_BOX")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
