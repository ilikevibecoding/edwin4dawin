#!/usr/bin/env python3
"""Derive the full rank-four internal-spine one-ended-broom coefficients.

After deleting the deepest support s, its protected child-side component A
is a path from the attachment endpoint a to the marked endpoint u, possibly
with arbitrary unmarked leaves supported at u.  Put

    X=I(A), Y=I(A-u), A0=I(A-a), B0=I(A-{a,u}).

For the parent-side forest F with mark v and neighbour p, put
R0,Rv,Rp,Rvp for its four deletion rows.  Then exactly

    C=(X R0, Y R0, X Rv, Y Rv),
    D=(A0 Rp, B0 Rp, A0 Rvp, B0 Rvp).

This script derives g1,g2 from the defining Gamma finite differences.  It is
an algebraic reduction only and intentionally makes no sign claim.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_polynomial_root import add_xd, isolate_multiply, nested_rank


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_internal_spine_broom_factor_root_20260829.json"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def multiply(left, right, maximum=5):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, k - j) for j in range(k + 1)))
        for k in range(maximum + 1)
    )


def gamma(crows, drows, number):
    tm = add_xd(isolate_multiply(crows, sp.Integer(number), 5), drows)
    t0 = add_xd(crows, drows)
    lower = sum(
        nested_rank(isolate_multiply(crows, sp.Integer(t), 4), 3)
        for t in range(number)
    )
    return sp.expand(nested_rank(tm, 4) - nested_rank(t0, 4) - lower)


def summarize(expression):
    symbols = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    coefficients = polynomial.coeffs()
    return {
        "monomials": len(coefficients),
        "negative_scalar_coefficients": sum(value.is_negative is True for value in coefficients),
        "positive_scalar_coefficients": sum(value.is_positive is True for value in coefficients),
        "factor": str(sp.factor(expression)),
    }


def main():
    maximum = 5
    x = tuple(sp.symbols(f"x0:{maximum + 1}"))
    y = tuple(sp.symbols(f"y0:{maximum + 1}"))
    a0 = tuple(sp.symbols(f"a0_0:{maximum + 1}"))
    b0 = tuple(sp.symbols(f"b0_0:{maximum + 1}"))
    r0 = tuple(sp.symbols(f"r0_0:{maximum + 1}"))
    rv = tuple(sp.symbols(f"rv_0:{maximum + 1}"))
    rp = tuple(sp.symbols(f"rp_0:{maximum + 1}"))
    rvp = tuple(sp.symbols(f"rvp_0:{maximum + 1}"))

    crows = (
        multiply(x, r0), multiply(y, r0), multiply(x, rv), multiply(y, rv)
    )
    drows = (
        multiply(a0, rp), multiply(b0, rp), multiply(a0, rvp), multiply(b0, rvp)
    )
    gamma1 = gamma(crows, drows, 1)
    gamma2 = gamma(crows, drows, 2)
    constants = {row[0]: 1 for row in (x, y, a0, b0, r0, rv, rp, rvp)}
    g1 = sp.expand(gamma1.subs(constants))
    g2 = sp.expand((gamma2 - 2 * gamma1).subs(constants))

    report = {
        "marker": "DERIVED_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_FACTOR_ROOT",
        "geometry": {
            "C": "(X R0,Y R0,X Rv,Y Rv)",
            "D": "(A0 Rp,B0 Rp,A0 Rvp,B0 Rvp)",
            "child_rows": "X=I(A),Y=I(A-u),A0=I(A-a),B0=I(A-{a,u})",
        },
        "g1_normalized": summarize(g1),
        "g2_normalized": summarize(g2),
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
