#!/usr/bin/env python3
"""Exact finite evidence for the integer Sturm pattern of the bottom kernel.

For q=d-1 let

    Pi_d(x,y) = beta(x) K_d J beta(y)^T,

where beta is the cleared rational-Catalan basis and K_d is the inverse of
the explicit upper triangular M-matrix.  At x=-k, 3<=k<=d+2, the basis
vanishing gives the forced factor

    (y+d-k+7)_(k-4)                         (k>=4).

After removing it, exact computation finds a polynomial with coefficients
of one strict sign.  The signs alternate except at the unique adjacent pair

    g_d = floor((d+1)/3)+2.

Consequently, if this coefficient assertion is proved for every d, then for
each y>=0 the degree-(d-2) polynomial Pi_d(x,y) has one simple root in every
interval between -3,-4,...,-d-2 except (-g_d-1,-g_d).  This script records
finite exact evidence only; it does not prove the all-d assertion.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import (
    central_inverse_from_blocks,
    reverse_identity,
)


OUT = Path("bottom_kernel_integer_sturm_pattern_certificate_20260803.json")
Y = sp.symbols("y")


def expected_sign(d: int, k: int) -> int:
    gap = (d + 1) // 3 + 2
    return (-1) ** (k - 3 - (1 if k > gap else 0))


def main() -> None:
    evaluation_checks = 0
    forced_factor_checks = 0
    strict_coefficient_checks = 0
    sign_transition_checks = 0
    records = []

    for d in range(3, 21):
        q = d - 1
        basis = cleared_catalan_basis(q)
        variable = basis[0].gens[0]
        kernel = central_inverse_from_blocks(d).inv()
        reversal = reverse_identity(q)
        right = reversal * sp.Matrix(
            q,
            1,
            [polynomial.as_expr().subs(variable, Y) for polynomial in basis],
        )

        signs = []
        local_coefficients = 0
        for k in range(3, d + 3):
            left = sp.Matrix(1, q, [polynomial.eval(-k) for polynomial in basis])
            value = sp.cancel((left * kernel * right)[0])
            evaluation_checks += 1

            forced = (
                sp.prod(Y + offset for offset in range(d - k + 7, d + 3))
                if k >= 4
                else sp.Integer(1)
            )
            quotient = sp.cancel(value / forced)
            assert not sp.denom(quotient).has(Y)
            assert sp.cancel(value - forced * quotient) == 0
            forced_factor_checks += 1

            sign = expected_sign(d, k)
            polynomial = sp.Poly(sign * quotient, Y)
            # The left endpoint k=3 has no degree drop. From k=4 onward,
            # each increment of k removes one additional top-degree term.
            expected_degree = d - 2 if k == 3 else d - k + 2
            assert polynomial.degree() == expected_degree
            assert all(coefficient > 0 for coefficient in polynomial.all_coeffs())
            local_coefficients += len(polynomial.all_coeffs())
            strict_coefficient_checks += len(polynomial.all_coeffs())
            signs.append(sign)

        gap = (d + 1) // 3 + 2
        repeated = [
            k
            for k in range(3, d + 2)
            if signs[k - 3] == signs[k - 2]
        ]
        assert repeated == [gap]
        assert sum(signs[index] != signs[index + 1] for index in range(d - 1)) == d - 2
        sign_transition_checks += d - 1

        records.append(
            {
                "d": d,
                "kernel_degree_in_each_variable": d - 2,
                "integer_evaluations": d,
                "positive_normalized_coefficients": local_coefficients,
                "unique_no_sign_change_between_nodes": [-(gap + 1), -gap],
                "forced_real_root_intervals_if_uniform_lemma_is_proved": d - 2,
            }
        )

    report = {
        "kind": "bottom_kernel_integer_sturm_pattern_certificate",
        "status": "PASS_EXACT_INTEGER_STURM_PATTERN",
        "d_range": [3, 20],
        "integer_evaluation_checks": evaluation_checks,
        "forced_rising_factor_checks": forced_factor_checks,
        "strict_normalized_coefficient_checks": strict_coefficient_checks,
        "sign_transition_checks": sign_transition_checks,
        "sign_rule": (
            "sign Pi_d(-k,y) = (-1)^(k-3-1[k>g_d]) for y>=0, "
            "where g_d=floor((d+1)/3)+2"
        ),
        "conditional_consequence": (
            "For every y>=0, Pi_d(x,y) has d-2 simple negative roots, one "
            "between each consecutive pair of nodes -3,...,-d-2 except "
            "the unique interval (-g_d-1,-g_d)."
        ),
        "remaining_lemmas": [
            "Prove the normalized evaluation coefficient positivity for every d.",
            "Upgrade sectionwise Sturm geometry to the required higher-order Chebyshev/total-positivity statement.",
        ],
        "scope": (
            "All checks are exact over the rationals.  The d<=20 audit is "
            "finite evidence, not an all-d proof."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
