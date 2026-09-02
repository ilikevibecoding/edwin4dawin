#!/usr/bin/env python3
"""Derive the exact mark-incidence form of the bundle coefficient g2.

For a marked independence complex, split faces after deleting their marks
into P (neither), A (u only), B (v only), and C (both).  Upper-case letters
below denote the analogous split after support-neighborhood deletion.  This
file performs only exact substitution and coefficient inspection.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from analyze_bundle_g12_agent_20260829 import symbolic_coefficients


def row(prefix: str, rank: int) -> dict[sp.Symbol, sp.Expr]:
    p = lambda index: sp.symbols(f"{prefix}p{index}") if index >= 0 else sp.Integer(0)
    a = lambda index: sp.symbols(f"{prefix}a{index}") if index >= 0 else sp.Integer(0)
    b = lambda index: sp.symbols(f"{prefix}b{index}") if index >= 0 else sp.Integer(0)
    c = lambda index: sp.symbols(f"{prefix}c{index}") if index >= 0 else sp.Integer(0)
    return {
        sp.symbols(f"{prefix}E{rank}"): p(rank) + a(rank - 1) + b(rank - 1) + c(rank - 2),
        sp.symbols(f"{prefix}U{rank}"): p(rank) + b(rank - 1),
        sp.symbols(f"{prefix}V{rank}"): p(rank) + a(rank - 1),
        sp.symbols(f"{prefix}W{rank}"): p(rank),
    }


def main() -> None:
    coefficients, structural = symbolic_coefficients()
    g2 = sp.expand(coefficients[2].subs(structural))
    substitutions: dict[sp.Symbol, sp.Expr] = {}
    for rank in range(2, 5):
        substitutions.update(row("c", rank))
    for rank in range(2, 4):
        substitutions.update(row("d", rank))
    incidence = sp.expand(g2.subs(substitutions))
    variables = sorted(incidence.free_symbols, key=str)
    polynomial = sp.Poly(incidence, *variables)
    terms = polynomial.terms()
    negative = [
        {"monomial": list(monomial), "coefficient": str(coefficient)}
        for monomial, coefficient in terms
        if coefficient < 0
    ]
    report = {
        "marker": "PASS_EXACT_BUNDLE_G2_MARK_INCIDENCE_IDENTITY_AGENT_20260829",
        "identity_status": "exact symbolic identity; nonnegativity is not asserted",
        "g2_incidence": str(sp.factor(incidence)),
        "term_count": len(terms),
        "negative_scalar_term_count": len(negative),
        "negative_terms": negative,
        "substitution": (
            "X_E[k]=Xp[k]+Xa[k-1]+Xb[k-1]+Xc[k-2], "
            "X_U[k]=Xp[k]+Xb[k-1], X_V[k]=Xp[k]+Xa[k-1], X_W[k]=Xp[k]"
        ),
        "scope": (
            "Universal exact marked-face decomposition of g2. Any sign proof "
            "still must use nesting and forest restriction structure."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    out = Path("bundle_g2_mark_incidence_exact_agent_20260829.json")
    out.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
