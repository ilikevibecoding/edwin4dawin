#!/usr/bin/env python3
"""Bounded exact extraction of the mask-0 joint selected boundary.

This avoids a monolithic SymPy rational substitution.  It first extracts the
131-term polynomial in (N,x,y,z), then substitutes the rational boundary by
clearing denominators term by term in python-flint's sparse integer ring.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx

import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_joint_selected_boundary_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def base_polynomial() -> sp.Poly:
    N, x, y, z = sp.symbols("N x y z")
    lower_d7 = (N**2 - 18 * N + 12) / (7 * N) * leaf.d[6]
    lower_c8 = (N**2 - 19 * N - 6) / (8 * (N + 1)) * leaf.c[7]
    expression = leaf.build_gates()["new_leaf_root_raw"][0]
    expression = expression.subs(
        {leaf.c[8]: lower_c8, leaf.d[7]: lower_d7}, simultaneous=True
    )
    structural = {
        leaf.c[index]: leaf.d[index] + (leaf.f[index - 1] if index else 0)
        for index in range(8)
    }
    expression = expression.subs(structural, simultaneous=True)
    expression = expression.subs({leaf.d[7]: lower_d7}, simultaneous=True)
    expression = sp.cancel(
        expression.subs(
            {leaf.d[6]: 1, leaf.d[5]: x, leaf.f[5]: y, leaf.f[6]: z},
            simultaneous=True,
        )
    )
    numerator, denominator = sp.fraction(expression)
    assert sp.factor(denominator) == 343 * N**4 * (N + 1) ** 2
    polynomial = sp.Poly(numerator, N, x, y, z, domain=sp.ZZ)
    assert len(polynomial.terms()) == 131
    return polynomial


def clear_boundary(polynomial: sp.Poly):
    context = fmpz_mpoly_ctx.get(["N", "r"])
    N, r = context.gens()
    m = N - r
    x_den = N**2 - 15 * N + 10
    x_num = 6 * N
    gap_den = 1
    for offset in range(6):
        gap_den *= N - offset
    gap_num = 6
    for offset in range(5):
        gap_num *= r - offset
    y_num = x_num * gap_den - gap_num * x_den
    y_den = x_den * gap_den
    f_selected_numerator = m**2 - 15 * m + 10
    z_num = y_num * f_selected_numerator
    z_den = y_den * 6 * m

    maxima = tuple(
        max(monomial[index] for monomial, _ in polynomial.terms())
        for index in range(1, 4)
    )
    assert maxima == (1, 2, 4)
    cleared = context.constant(0)
    for (n_power, x_power, y_power, z_power), coefficient in polynomial.terms():
        term = context.constant(int(coefficient)) * N**n_power
        term *= x_num**x_power * x_den ** (maxima[0] - x_power)
        term *= y_num**y_power * y_den ** (maxima[1] - y_power)
        term *= z_num**z_power * z_den ** (maxima[2] - z_power)
        cleared += term
    return cleared, {
        "x": "6N/(N^2-15N+10)",
        "gap": "6(r)_5/(N)_6",
        "y": "x-gap",
        "f5_over_f6": "6(N-r)/((N-r)^2-15(N-r)+10)",
        "z": "y/(f5/f6)",
        "common_denominator_exponents": list(maxima),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--factor", action="store_true")
    args = parser.parse_args()
    polynomial = base_polynomial()
    cleared, substitution = clear_boundary(polynomial)
    content, primitive = cleared.primitive()
    record = {
        "schema": "rank8-delta0-new-leaf-mask0-joint-selected-boundary-v1",
        "status": "EXACT_BOUNDARY_POLYNOMIAL_EXTRACTED_NO_SIGN_CLAIM",
        "base_terms": len(polynomial.terms()),
        "base_total_degree": polynomial.total_degree(),
        "cleared_terms": len(list(primitive.terms())),
        "cleared_total_degree": int(primitive.total_degree()),
        "content": str(content),
        "substitution": substitution,
        "source_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"
            )
        },
        "proof_boundary": (
            "This is the mask-0 value only at simultaneous selected-degree equality "
            "and the coarse binomial root-gap boundary.  It is an obstruction "
            "polynomial, not a realizability or sign theorem."
        ),
    }
    if args.factor:
        unit, factors = primitive.factor()
        largest_factor = max(factors, key=lambda item: int(item[0].total_degree()))[0]
        context = largest_factor.context()
        N, r = context.gens()
        by_complement_order = largest_factor.compose(N, N - r)
        fixed_n26 = largest_factor.subs({"N": 26})
        fixed_n26_unit, fixed_n26_factors = fixed_n26.factor()
        theta = sp.symbols("theta")
        leading_degree = int(largest_factor.total_degree())
        leading_scaled = sum(
            int(coefficient) * theta ** monomial[1]
            for monomial, coefficient in largest_factor.to_dict().items()
            if sum(monomial) == leading_degree
        )
        record["factorization"] = {
            "unit": str(unit),
            "factors": [
                {
                    "exponent": int(exponent),
                    "terms": len(list(factor.terms())),
                    "total_degree": int(factor.total_degree()),
                    "polynomial": str(factor),
                }
                for factor, exponent in factors
            ],
            "largest_factor_with_r_replaced_by_N_minus_m": {
                "variables": ["N", "m (printed as r)"],
                "terms": len(list(by_complement_order.terms())),
                "total_degree": int(by_complement_order.total_degree()),
                "polynomial": str(by_complement_order),
            },
            "largest_factor_at_N26": {
                "unit": str(fixed_n26_unit),
                "value_at_r10": str(fixed_n26.subs({"r": 10})),
                "factors": [
                    {"exponent": int(exponent), "polynomial": str(factor)}
                    for factor, exponent in fixed_n26_factors
                ],
            },
            "scaled_r_equals_theta_N_leading_form": {
                "degree_in_N": leading_degree,
                "polynomial": str(sp.factor(leading_scaled)),
            },
        }
        record["status"] = "EXACT_BOUNDARY_POLYNOMIAL_FACTORED_NO_SIGN_CLAIM"
    OUTPUT.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(record["status"])
    print("BASE", record["base_terms"], record["base_total_degree"])
    print("CLEARED", record["cleared_terms"], record["cleared_total_degree"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
