#!/usr/bin/env python3
"""Exact finite audit of the first PF-constrained compatibility step.

For the quadratic source ``Gamma=(1-u*t)(1-v*t)``, put

    G_j=t^j S_(p-2j,alpha+j)[Gamma].

Two appended negative factors give a PF coefficient triple.  After a
positive normalization every such triple has the form

    (a_0,a_1,a_2)=(q^2,2q+z,1),  q>0, z>=0.

The next induction step asks whether

    Q_0=sum_(j=0)^2 a_j G_j,
    Q_1=sum_(j=0)^2 a_j G_(j+1)

have a common interlacer at the sharp reserve p-alpha=17.  This script uses
exact rational root isolation on a finite grid.  It is a route-finding
audit, not an all-parameter proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial
from verify_two_outlier_adjacent_cubic_common_interlacing import (
    common_interlacer_overlap,
    isolating_intervals,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "pf_length3_adjacent_compatibility_exact_audit_20260806.json"


def primitive_digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    payload = ",".join(str(value) for value in primitive.all_coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def shifted_rows(
    p: int, alpha: int, u: Fraction, v: Fraction
) -> list[sp.Poly]:
    gamma = [sp.Integer(1), -(sp.Rational(u) + sp.Rational(v)), sp.Rational(u * v)]
    rows = []
    for index in range(4):
        base = window_polynomial(p - 2 * index, alpha + index, gamma)
        rows.append(sp.Poly(X**index * base.as_expr(), X, domain=sp.QQ))
    assert len({row.degree() for row in rows}) == 1
    return rows


def one_case(
    parity: str,
    reserve_index: int,
    u: Fraction,
    v: Fraction,
    q: Fraction,
    z: Fraction,
) -> dict[str, object]:
    if parity == "odd":
        p, alpha = 2 * reserve_index + 17, 2 * reserve_index
    else:
        p, alpha = 2 * reserve_index + 18, 2 * reserve_index + 1
    assert p - alpha == 17
    rows = shifted_rows(p, alpha, u, v)
    weights = [q * q, 2 * q + z, Fraction(1)]
    q0 = sp.Poly(
        sum(sp.Rational(weights[j]) * rows[j].as_expr() for j in range(3)),
        X,
        domain=sp.QQ,
    )
    q1 = sp.Poly(
        sum(sp.Rational(weights[j]) * rows[j + 1].as_expr() for j in range(3)),
        X,
        domain=sp.QQ,
    )
    assert q0.degree() == q1.degree() == p // 2
    roots0 = isolating_intervals(q0)
    roots1 = isolating_intervals(q1, allow_zero=True)
    overlap = common_interlacer_overlap(roots0, roots1)
    assert overlap
    return {
        "parity": parity,
        "reserve_index": reserve_index,
        "p": p,
        "alpha": alpha,
        "degree": q0.degree(),
        "u": str(u),
        "v": str(v),
        "q": str(q),
        "z": str(z),
        "pf_gap": str((2 * q + z) ** 2 - 4 * q * q),
        "strict_common_interlacer_overlap": True,
        "overlap_gap_count": q0.degree() - 1,
        "q0_digest": primitive_digest(q0),
        "q1_digest": primitive_digest(q1),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-r", type=int, default=2)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    assert args.max_r >= 0

    unit_values = [Fraction(1, 10), Fraction(1, 2), Fraction(1)]
    q_values = [Fraction(1, 10), Fraction(1), Fraction(10)]
    z_values = [Fraction(0), Fraction(1, 10), Fraction(1), Fraction(10)]
    cases: list[dict[str, object]] = []
    for parity in ("odd", "even"):
        for reserve_index in range(args.max_r + 1):
            for i, u in enumerate(unit_values):
                for v in unit_values[i:]:
                    for q in q_values:
                        for z in z_values:
                            cases.append(one_case(parity, reserve_index, u, v, q, z))

    report = {
        "status": "EXACT_FINITE_PF_LENGTH3_COMMON_INTERLACING_AUDIT",
        "statement": {
            "source": "Gamma=(1-u*t)(1-v*t)",
            "shift_family": "G_j=t^j S_(p-2j,alpha+j)[Gamma]",
            "pf_weights": "(q^2,2q+z,1), q>0, z>=0",
            "pair": "Q_0=sum_(j=0)^2 a_j G_j; Q_1=sum_(j=0)^2 a_j G_(j+1)",
            "sharp_reserve": "p-alpha=17",
        },
        "scope": {
            "max_reserve_index": args.max_r,
            "u_v_values": [str(value) for value in unit_values],
            "q_values": [str(value) for value in q_values],
            "z_values": [str(value) for value in z_values],
            "case_count": len(cases),
            "exact_overlap_gap_count": sum(int(case["overlap_gap_count"]) for case in cases),
        },
        "logical_status": (
            "Finite exact evidence for the first PF-constrained induction step; "
            "not an all-parameter or all-order proof."
        ),
        "cases": cases,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
