#!/usr/bin/env python3
"""Exact PF-adjacent recovery of the Section 42 transfer counterexample.

The unrestricted residual-product lemma fails for the five-factor input, but
the correct factor-by-factor PF mechanism succeeds: the two rows before the
fifth factor have a strict common interlacer, and their positive combination
is exactly the twelve-negative-root window from Section 42.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_transfer_counterexample_pf_recovery_exact_20260809.json"
X = sp.symbols("x")
T = sp.symbols("t")


def window_polynomial(p: int, alpha: int, gamma: sp.Poly) -> sp.Poly:
    value = sp.Integer(0)
    for k in range(p // 2 + 1):
        inner = sum(
            gamma.nth(h)
            * sp.factorial(p - 2 * h)
            / (sp.factorial(p + alpha - h) * sp.factorial(k - h))
            for h in range(min(k, gamma.degree()) + 1)
        )
        coefficient = (
            sp.factorial(p + 2 * alpha)
            / sp.factorial(alpha)
            * inner
            / (sp.factorial(p - 2 * k) * sp.rf(alpha + 1, k))
        )
        value += coefficient * X**k
    return sp.Poly(sp.factor(value), X)


def intervals(poly: sp.Poly, *, allow_zero: bool = False) -> list[tuple[sp.Rational, sp.Rational]]:
    result: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in poly.intervals(eps=sp.Rational(1, 10**40)):
        assert multiplicity == 1
        item = (sp.Rational(interval[0]), sp.Rational(interval[1]))
        result.append(item)
    assert len(result) == poly.degree()
    if allow_zero:
        assert all(right <= 0 for _, right in result) and result[-1] == (0, 0)
    else:
        assert all(right < 0 for _, right in result)
    return result


def strict_common_interlacer(
    left: list[tuple[sp.Rational, sp.Rational]],
    right: list[tuple[sp.Rational, sp.Rational]],
) -> bool:
    return len(left) == len(right) and all(
        left[i][1] < right[i + 1][0] and right[i][1] < left[i + 1][0]
        for i in range(len(left) - 1)
    )


def digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), X)[1]
    return hashlib.sha256(str(primitive).encode("utf-8")).hexdigest()


def main() -> None:
    p = 25
    alpha = 0
    u = v = sp.Rational(1, 20)
    c = sp.Rational(1, 1000)

    gamma_four = sp.Poly(sp.expand((1 - u * T) * (1 - v * T) * (T + c) ** 4), T)
    gamma_five = sp.Poly(sp.expand((T + c) * gamma_four.as_expr()), T)
    q0 = window_polynomial(p, alpha, gamma_four)
    q1 = sp.Poly(X * window_polynomial(p - 2, alpha + 1, gamma_four).as_expr(), X)
    final_window = window_polynomial(p, alpha, gamma_five)
    assert sp.Poly(sp.expand(c * q0.as_expr() + q1.as_expr()), X) == final_window

    roots0 = intervals(q0)
    roots1 = intervals(q1, allow_zero=True)
    roots_final = intervals(final_window)
    assert strict_common_interlacer(roots0, roots1)
    assert len(roots_final) == 12 and all(right < 0 for _, right in roots_final)

    overlap_gaps = []
    for i in range(len(roots0) - 1):
        gap = min(roots0[i + 1][0], roots1[i + 1][0]) - max(roots0[i][1], roots1[i][1])
        assert gap > 0
        overlap_gaps.append(gap)

    payload = {
        "kind": "window_transfer_counterexample_pf_recovery_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_PF_RECOVERY_OF_TRANSFER_COUNTEREXAMPLE",
        "parameters": {
            "p": p,
            "alpha": alpha,
            "u": str(u),
            "v": str(v),
            "prior_negative_factors": 4,
            "appended_factor": "t+1/1000",
        },
        "exact_identity": "S_25,0[(t+c)Gamma]=c*S_25,0[Gamma]+t*S_23,1[Gamma]",
        "row_root_counts": {
            "q0_strictly_negative": len(roots0),
            "q1_strictly_negative": len(roots1) - 1,
            "q1_zero": 1,
            "strict_common_interlacer_gaps": len(overlap_gaps),
        },
        "final_window": {
            "degree": final_window.degree(),
            "strictly_negative_roots": len(roots_final),
            "nonreal_roots": final_window.degree() - len(roots_final),
        },
        "minimum_certified_overlap_gap_decimal": str(sp.N(min(overlap_gaps), 22)),
        "primitive_polynomial_sha256": {
            "q0": digest(q0),
            "q1": digest(q1),
            "final_window": digest(final_window),
        },
        "conclusion": (
            "The false residual-product condition is not needed for this exact input; "
            "the PF-constrained adjacent-row induction proves the desired window directly."
        ),
        "remaining_theorem": (
            "Prove the PF adjacent-row common-interlacer statement for arbitrary factor length."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**payload, "output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
