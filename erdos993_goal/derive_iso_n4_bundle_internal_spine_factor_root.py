#!/usr/bin/env python3
"""Derive the missing rank-four whole-bundle internal-spine coefficients.

Root the marked component at v.  If a deepest eligible unmarked support s
has two nonbundle neighbours, its child-side component after deleting s is a
bare path A=P_ell ending at u.  Write

    X=I(P_ell), Y=I(P_(ell-1)), Z=I(P_(ell-2)), X=Y+xZ.

The parent-side forest F contains v and the distinguished parent p.  With
R0=I(F), Rv=I(F-v), Rp=I(F-p), Rvp=I(F-{v,p}), the support-deleted and
closed-neighbourhood-deleted four rows are

    C=(X R0, Y R0, X Rv, Y Rv),
    D=(Y Rp, Z Rp, Y Rvp, Z Rvp).

This script derives the exact g1 and g2 binomial bundle coefficients from
the defining Gamma polynomial.  It is an algebraic reduction, not a sign
theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_polynomial_root import add_xd, isolate_multiply, nested_rank


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_internal_spine_factor_root_20260829.json"


def at(row: tuple[sp.Expr, ...], rank: int) -> sp.Expr:
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def multiply(a: tuple[sp.Expr, ...], b: tuple[sp.Expr, ...], maximum: int = 5):
    return tuple(
        sp.expand(sum(at(a, j) * at(b, k - j) for j in range(k + 1)))
        for k in range(maximum + 1)
    )


def gamma_at(crows, drows, number: int) -> sp.Expr:
    m = sp.Integer(number)
    tm = add_xd(isolate_multiply(crows, m, 5), drows)
    t0 = add_xd(crows, drows)
    lower_sum = sum(
        nested_rank(isolate_multiply(crows, sp.Integer(t), 4), 3)
        for t in range(number)
    )
    return sp.expand(nested_rank(tm, 4) - nested_rank(t0, 4) - lower_sum)


def summary(expression: sp.Expr) -> dict[str, object]:
    polynomial = sp.Poly(sp.expand(expression), *sorted(expression.free_symbols, key=str))
    coefficients = polynomial.coeffs()
    return {
        "monomials": len(coefficients),
        "negative_scalar_coefficients": sum(c.is_negative is True for c in coefficients),
        "positive_scalar_coefficients": sum(c.is_positive is True for c in coefficients),
        "factor": str(sp.factor(expression)),
    }


def main() -> None:
    maximum = 5
    y = tuple(sp.symbols(f"y0:{maximum + 1}"))
    z = tuple(sp.symbols(f"z0:{maximum + 1}"))
    x = tuple(sp.expand(at(y, k) + at(z, k - 1)) for k in range(maximum + 1))
    r0 = tuple(sp.symbols(f"r0_0:{maximum + 1}"))
    rv = tuple(sp.symbols(f"rv_0:{maximum + 1}"))
    rp = tuple(sp.symbols(f"rp_0:{maximum + 1}"))
    rvp = tuple(sp.symbols(f"rvp_0:{maximum + 1}"))

    crows = (
        multiply(x, r0),
        multiply(y, r0),
        multiply(x, rv),
        multiply(y, rv),
    )
    drows = (
        multiply(y, rp),
        multiply(z, rp),
        multiply(y, rvp),
        multiply(z, rvp),
    )

    gamma1 = gamma_at(crows, drows, 1)
    gamma2 = gamma_at(crows, drows, 2)
    g1 = sp.expand(gamma1)
    g2 = sp.expand(gamma2 - 2 * gamma1)

    # Independence polynomials have constant coefficient one.  Apply this
    # universal normalization before recording the useful forms.
    constants = {row[0]: 1 for row in (y, z, r0, rv, rp, rvp)}
    g1_normalized = sp.expand(g1.subs(constants))
    g2_normalized = sp.expand(g2.subs(constants))

    report = {
        "marker": "DERIVED_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_FACTOR_ROOT",
        "geometry": {
            "C": "(X R0,Y R0,X Rv,Y Rv)",
            "D": "(Y Rp,Z Rp,Y Rvp,Z Rvp)",
            "path_recurrence": "X=Y+xZ",
            "parent_side": "R0=I(F), Rv=I(F-v), Rp=I(F-p), Rvp=I(F-{v,p})",
        },
        "g1_normalized": summary(g1_normalized),
        "g2_normalized": summary(g2_normalized),
        "scope": "Exact algebraic reduction only; no positivity claim.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "g1": {k: v for k, v in report["g1_normalized"].items() if k != "factor"},
        "g2": {k: v for k, v in report["g2_normalized"].items() if k != "factor"},
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
