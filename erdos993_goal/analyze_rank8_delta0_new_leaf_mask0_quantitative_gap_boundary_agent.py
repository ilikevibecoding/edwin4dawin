#!/usr/bin/env python3
"""Exact mask-0 joint boundary after the distinguished-root gap payment."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent import (
    base_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_quantitative_gap_boundary_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def clear_quantitative_boundary(polynomial: sp.Poly):
    context = fmpz_mpoly_ctx.get(["N", "r"])
    N, r = context.gens()
    m = N - r
    x_den = N**2 - 15 * N + 10
    x_num = 6 * N
    n_falling_6 = context.constant(1)
    for offset in range(6):
        n_falling_6 *= N - offset

    # If G=sum_{j=0}^4 C(m-j+1,j)C(r-j,5-j), then
    # 120G=sum C(5,j)(m-j+1)_j(r-j)_(5-j).
    h120 = context.constant(0)
    for j in range(5):
        term = context.constant(int(sp.binomial(5, j)))
        for offset in range(j):
            term *= m - j + 1 - offset
        for offset in range(5 - j):
            term *= r - j - offset
        h120 += term
    gap_num = 6 * h120
    gap_den = n_falling_6
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
    return cleared, h120


def main() -> None:
    polynomial = base_polynomial()
    cleared, h120 = clear_quantitative_boundary(polynomial)
    content, primitive = cleared.primitive()
    unit, factors = primitive.factor()
    largest = max(factors, key=lambda item: int(item[0].total_degree()))[0]
    theta = sp.symbols("theta")
    leading_degree = int(largest.total_degree())
    leading_scaled = sum(
        int(coefficient) * theta ** monomial[1]
        for monomial, coefficient in largest.to_dict().items()
        if sum(monomial) == leading_degree
    )
    fixed_n26 = largest.subs({"N": 26})
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-quantitative-gap-boundary-v1",
        "status": "EXACT_QUANTITATIVE_GAP_BOUNDARY_FACTORED_NO_GLOBAL_SIGN_CLAIM",
        "gap_lemma": {
            "m": "N-r=|F|",
            "G": "sum_{j=0}^4 binom(m-j+1,j) binom(r-j,5-j)",
            "coefficient_gap": "d5-f5>=G",
            "normalized_gap": "(d5-f5)/d6>=G/binom(N,6)",
            "reason": (
                "an independent j-set of F forbids at most j distinguished roots; "
                "also every order-m forest has f_j>=binom(m-j+1,j) by leaf induction"
            ),
            "120G_polynomial": str(h120),
        },
        "base_terms": len(polynomial.terms()),
        "cleared_terms": len(list(primitive.terms())),
        "cleared_total_degree": int(primitive.total_degree()),
        "content": str(content),
        "factorization": {
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
        },
        "largest_factor": {
            "terms": len(list(largest.terms())),
            "total_degree": leading_degree,
            "value_at_N26_r10": str(fixed_n26.subs({"r": 10})),
            "scaled_r_equals_theta_N_leading_form": str(sp.factor(leading_scaled)),
        },
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py": sha256(
                HERE / "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py"
            ),
        },
        "proof_boundary": (
            "This factors the worst simultaneous selected-degree/root-gap boundary "
            "for mask 0.  A sign theorem still requires proving monotonicity away "
            "from the boundary and positivity of the remaining factor on the full "
            "integer domain; neither is credited here."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CLEARED", payload["cleared_terms"], payload["cleared_total_degree"])
    print("LARGEST", payload["largest_factor"]["terms"], leading_degree)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
