"""Exact finite audit of the Cayley coefficient-variation reformulation.

For q and R from the corrected lower-selector M1 problem, put

    C(w) = (w-1)^m q(R (w+1)/(w-1)).

The earlier Schur--Sturm audit proves, in the same 770 cells, that the
exterior-disk root count equals the negative exterior real-root count.  The
Cayley map sends these respectively to the right-half-plane root count and
the positive-real root count of C.  This replay checks that their common
value is also the ordinary coefficient sign variation of C.

This is finite evidence and a reduction target, not an all-order proof.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from math import comb
from pathlib import Path

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from audit_lower_selector_m1_schur_sturm_indices import (
    primitive_integer_coefficients,
    rational_schur_cohn_matrix,
    sign_changes,
)
from verify_lower_qsharp_reduction import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_cayley_sign_variation_exact_20260812.json"


def quadratic_sign(even_part: sp.Rational, odd_part: sp.Rational, a: sp.Rational) -> int:
    """Sign of even_part + sqrt(a)*odd_part, known to be nonzero."""

    if odd_part == 0:
        return 1 if even_part > 0 else -1
    if even_part == 0:
        return 1 if odd_part > 0 else -1
    if (even_part > 0) == (odd_part > 0):
        return 1 if even_part > 0 else -1
    norm = even_part**2 - a * odd_part**2
    assert norm != 0
    return (1 if even_part > 0 else -1) if norm > 0 else (1 if odd_part > 0 else -1)


def cayley_coefficient_signs(q: sp.Poly, a: sp.Rational) -> list[int]:
    """Signs of C(w), in descending degree, without adjoining sqrt(a)."""

    m = q.degree()
    ascending = [sp.Rational(q.nth(k)) for k in range(m + 1)]
    result: list[int] = []
    for power in range(m, -1, -1):
        even_part = sp.Rational(0)
        odd_part = sp.Rational(0)
        for k, q_k in enumerate(ascending):
            basis_coefficient = sum(
                comb(k, left)
                * comb(m - k, power - left)
                * (-1) ** (m - k - power + left)
                for left in range(
                    max(0, power - (m - k)),
                    min(k, power) + 1,
                )
            )
            if k % 2:
                odd_part += q_k * basis_coefficient * a ** ((k - 1) // 2)
            else:
                even_part += q_k * basis_coefficient * a ** (k // 2)
        result.append(quadratic_sign(even_part, odd_part, a))
    return result


def main() -> None:
    cases = 0
    variation_counts: Counter[int] = Counter()
    degree_variation_counts: Counter[str] = Counter()
    for d in range(5, 15):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                gamma = selector_gamma(path_n, row_s)
                forced = max(0, row_s - path_n + 1)
                gamma_hat = gamma[forced:]
                m = len(gamma_hat) - 1
                outer_p = d + row_s
                effective_p = outer_p - 2 * forced
                half_p = effective_p // 2
                beta = sp.Rational(1 if effective_p % 2 else -1, 2)
                duran_s = half_p - m + 2
                a = sp.Rational((duran_s - 1) * (duran_s + beta - 1))
                assert a > 0

                q = duran_polynomial(outer_p - forced, gamma_hat)
                coefficients = primitive_integer_coefficients(q)
                schur = rational_schur_cohn_matrix(coefficients, a)
                leading = [sp.Integer(1)] + [
                    sp.factor(schur[:order, :order].det(method="domain-ge"))
                    for order in range(1, m + 1)
                ]
                exterior = sign_changes([1 if value > 0 else -1 for value in leading])

                cayley_signs = cayley_coefficient_signs(q, a)
                variation = sign_changes(cayley_signs)
                assert variation == exterior, (
                    d,
                    r,
                    row_s,
                    m,
                    exterior,
                    variation,
                    cayley_signs,
                )
                cases += 1
                variation_counts[variation] += 1
                degree_variation_counts[f"m={m},v={variation}"] += 1

    assert cases == 770
    payload = {
        "kind": "lower_selector_cayley_sign_variation_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_770_CELL_CAYLEY_SIGN_VARIATION_AUDIT",
        "scope": "finite exact evidence, not an all-order theorem",
        "cases": cases,
        "all_coefficient_variations_equal_schur_exterior_indices": True,
        "interpretation": (
            "Together with the existing Schur--Sturm equality, coefficient "
            "variation of the Cayley polynomial equals both its right-half-"
            "plane root count and its positive-real root count."
        ),
        "variation_counts": dict(sorted(variation_counts.items())),
        "degree_variation_counts": dict(sorted(degree_variation_counts.items())),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report_hash = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
    print(payload["status"])
    print("source_sha256", source_hash)
    print("report_sha256", report_hash)


if __name__ == "__main__":
    main()
