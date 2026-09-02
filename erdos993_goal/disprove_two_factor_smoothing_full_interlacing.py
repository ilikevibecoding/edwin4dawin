"""Exact obstruction to full interlacing after a two-factor PF smoothing.

The PF-constrained adjacent pairs continue to pass, but the stronger hope
that two appended factors make the entire shifted family compatible with all
nonnegative weights is false.  This script records exact real-root counts for
F0+lambda*F2 after the smoothing kernel (t+1)^2.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from audit_pf_arbitrary_length_common_interlacing import pf_weights, shifted_rows
from prove_quartic_minimal_compatibility_resultants import X


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "two_factor_smoothing_full_interlacing_obstruction_exact_20260807.json"


def record(parity, lam):
    p, alpha = ((21, 0) if parity == "odd" else (22, 1))
    rows = shifted_rows(p, alpha, Fraction(1, 2), Fraction(4, 5), 5)
    weights = pf_weights((Fraction(1), Fraction(1)))
    filtered = [
        sp.Poly(sum(weights[j] * rows[i + j].as_expr() for j in range(3)), X, domain=sp.QQ)
        for i in range(3)
    ]
    candidate = sp.Poly(filtered[0].as_expr() + lam * filtered[2].as_expr(), X, domain=sp.QQ)
    intervals = candidate.intervals(eps=sp.Rational(1, 10**30))
    real_count = sum(multiplicity for _, multiplicity in intervals)
    _, cleared = candidate.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    digest = hashlib.sha256(
        ",".join(str(value) for value in primitive.all_coeffs()).encode("ascii")
    ).hexdigest()
    assert real_count < candidate.degree()
    return {
        "parity": parity,
        "p": p,
        "alpha": alpha,
        "u": "1/2",
        "v": "4/5",
        "smoothing_kernel": "(t+1)^2",
        "candidate": f"F0+{lam}*F2",
        "degree": candidate.degree(),
        "real_root_count_with_multiplicity": real_count,
        "nonreal_root_count": candidate.degree() - real_count,
        "primitive_coefficient_sha256": digest,
    }


def main():
    records = [record("odd", 10_000), record("even", 100)]
    report = {
        "status": "EXACT_TWO_FACTOR_SMOOTHING_FULL_INTERLACING_OBSTRUCTION",
        "records": records,
        "consequence": (
            "Two-factor PF smoothing does not make the whole shifted family "
            "compatible with the full nonnegative cone.  The failing weights "
            "(1,0,lambda) are not PF, so this does not contradict the exact "
            "PF length-four through length-six audits; it rules out only the "
            "fully-interlacing matrix-product shortcut."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
