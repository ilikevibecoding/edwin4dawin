#!/usr/bin/env python3
"""Exact singleton-support-neighborhood reductions for bundle g2.

If the unmarked support s is a leaf in the base forest, then C=H-s and
D=H-N[s]=C-a for its unique neighbour a.  This file derives the two cases
a distinct from both marks and a equal to one mark.  It is an algebraic
reduction, not by itself a sign theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from analyze_bundle_g12_agent_20260829 import symbolic_coefficients


def main() -> None:
    coefficients, structural = symbolic_coefficients()
    g2 = sp.expand(coefficients[2].subs(structural))
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v")

    # Case A: the deleted neighbour a is distinct from both marks.  Every
    # four-minor row obeys cX_k=dX_k+hX_(k-1), where h is the appropriate
    # mark-restriction tuple after deleting N_C[a].
    distinct_subs: dict[sp.Symbol, sp.Expr] = {n: q + 1, eu: 1, ev: 1}
    for name in "EUVW":
        for rank in range(2, 6):
            distinct_subs[sp.symbols(f"c{name}{rank}")] = (
                sp.symbols(f"d{name}{rank}") + sp.symbols(f"h{name}{rank - 1}")
            )
    distinct = sp.expand(g2.subs(distinct_subs))

    # Structural first coefficients of D (order q, both marks survive) and h
    # (order r, with survival indicators eta_u,eta_v).
    r, eta_u, eta_v = sp.symbols("r eta_u eta_v")
    first_subs = {
        sp.symbols("dE1"): q,
        sp.symbols("dU1"): q - 1,
        sp.symbols("dV1"): q - 1,
        sp.symbols("dW1"): q - 2,
        sp.symbols("hE0"): 1,
        sp.symbols("hU0"): 1,
        sp.symbols("hV0"): 1,
        sp.symbols("hW0"): 1,
        sp.symbols("hE1"): r,
        sp.symbols("hU1"): r - eta_u,
        sp.symbols("hV1"): r - eta_v,
        sp.symbols("hW1"): r - eta_u - eta_v,
    }
    distinct_structural = sp.expand(distinct.subs(first_subs))

    # Case B: a=u.  Then D_E=D_U=C_U and D_V=D_W=C_W;
    # epsilon_u=0, epsilon_v=1.  The a=v case follows by symmetry.
    marked_subs: dict[sp.Symbol, sp.Expr] = {n: q + 1, eu: 0, ev: 1}
    for rank in range(2, 5):
        marked_subs[sp.symbols(f"dE{rank}")] = sp.symbols(f"cU{rank}")
        marked_subs[sp.symbols(f"dU{rank}")] = sp.symbols(f"cU{rank}")
        marked_subs[sp.symbols(f"dV{rank}")] = sp.symbols(f"cW{rank}")
        marked_subs[sp.symbols(f"dW{rank}")] = sp.symbols(f"cW{rank}")
    marked = sp.expand(g2.subs(marked_subs))

    def stats(expression: sp.Expr) -> dict:
        poly = sp.Poly(expression, *sorted(expression.free_symbols, key=str))
        coefficients_ = poly.coeffs()
        return {
            "factor": str(sp.factor(expression)),
            "term_count": len(coefficients_),
            "negative_scalar_coefficient_count": sum(
                1 for value in coefficients_ if value.is_negative is True
            ),
        }

    report = {
        "marker": "PASS_EXACT_BUNDLE_G2_SINGLETON_NEIGHBORHOOD_REDUCTION_AGENT_20260829",
        "distinct_neighbor": stats(distinct_structural),
        "marked_neighbor": stats(marked),
        "identities": {
            "distinct": "n=q+1, epsilon_u=epsilon_v=1, cX_k=dX_k+hX_(k-1)",
            "marked": "a=u: n=q+1, (epsilon_u,epsilon_v)=(0,1), dE=dU=cU, dV=dW=cW",
        },
        "scope": (
            "Exact reduction for base-support degree one. The displayed "
            "polynomials are not claimed nonnegative without further forest bounds."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    out = Path("bundle_g2_singleton_reduction_exact_agent_20260829.json")
    out.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
