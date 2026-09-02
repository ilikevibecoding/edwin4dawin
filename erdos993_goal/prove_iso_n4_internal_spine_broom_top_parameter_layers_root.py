#!/usr/bin/env python3
"""Prove the top (ell,k)-Newton layers of the internal-spine broom payment.

The parameter reduction has triangular supports.  Every nonzero coefficient
form with at most eight parent-row monomials depends only on order n, edges e,
degree d(v), and whether p=v.  Exact substitution reduces each nonconstant
form to

    -5 d + c_delta delta + A n + 10 (e-d) + C,

which is positive from e>=d, d<=n-1, and delta in {0,1}.  The remaining
three-monomial layers are positive constants.  This proves 9/15 g1 forms and
7/10 g2 forms; the lower 45/30/17-monomial forms remain separate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_internal_spine_broom_parameters_root_20260829.json"
OUTPUT = HERE / "iso_n4_internal_spine_broom_top_parameter_layers_exact_root_20260829.json"


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_INTERNAL_SPINE_BROOM_PARAMETER_NEWTON_ROOT"
    n, e, d, delta, reserve = sp.symbols(
        "n e d delta reserve", integer=True, nonnegative=True
    )
    substitutions = {
        sp.symbols("r0_1"): n,
        sp.symbols("rv_1"): n - 1,
        sp.symbols("rp_1"): n - 1,
        sp.symbols("rvp_1"): n - 2 + delta,
        sp.symbols("r0_2"): n * (n - 1) / 2 - e,
        sp.symbols("rv_2"): (n - 1) * (n - 2) / 2 - e + d,
    }

    results = {}
    total_proved = 0
    for name, block in dependency["coefficients"].items():
        proved = []
        remaining = []
        for form in block["forms"]:
            expression = sp.sympify(form["factor"])
            if form["monomials"] > 8:
                remaining.append([form["h_index"], form["k_index"]])
                continue
            reduced = sp.factor(expression.subs(substitutions).subs(e, d + reserve))
            # Minimize exactly over reserve>=0, d<=n-1, and delta in {0,1}.
            reserve_coefficient = sp.diff(reduced, reserve)
            degree_coefficient = sp.diff(reduced, d)
            delta_coefficient = sp.diff(reduced, delta)
            assert reserve_coefficient >= 0
            degree_boundary = n - 1 if degree_coefficient < 0 else 0
            delta_boundary = 1 if delta_coefficient < 0 else 0
            lower = sp.factor(
                reduced.subs({reserve: 0, d: degree_boundary, delta: delta_boundary})
            )
            shifted = sp.Poly(sp.expand(lower.subs(n, 1 + sp.symbols("t", nonnegative=True))), sp.symbols("t"))
            assert all(coefficient > 0 for coefficient in shifted.all_coeffs())
            proved.append({
                "h_index": form["h_index"],
                "k_index": form["k_index"],
                "row_form": form["factor"],
                "structural_reduction": str(reduced),
                "lower": str(lower),
            })
            total_proved += 1
        results[name] = {
            "proved_forms": proved,
            "proved_count": len(proved),
            "remaining_indices": remaining,
            "remaining_count": len(remaining),
        }

    assert results["g1_normalized"]["proved_count"] == 9
    assert results["g1_normalized"]["remaining_count"] == 6
    assert results["g2_normalized"]["proved_count"] == 7
    assert results["g2_normalized"]["remaining_count"] == 3
    assert total_proved == 16

    report = {
        "marker": "PASS_EXACT_ISO_N4_INTERNAL_SPINE_BROOM_TOP_PARAMETER_LAYERS_ROOT",
        "theorem": (
            "In the stable ell>=7 one-ended-broom parameter expansion, all 16 "
            "nonzero g1/g2 coefficient forms having at most eight row monomials "
            "are nonnegative for every parent-side forest and every p placement."
        ),
        "forest_facts": "e>=d(v), d(v)<=n-1; delta=1 iff p=v and otherwise 0",
        "results": results,
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "scope_guard": (
            "This proves 16 of the 25 stable parameter forms only. The six g1 "
            "and three g2 lower forms, ell=1..6, full rank4 payment, all N4, "
            "and Erdos Problem 993 remain separate."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "g1_proved": results["g1_normalized"]["proved_count"],
        "g1_remaining": results["g1_normalized"]["remaining_count"],
        "g2_proved": results["g2_normalized"]["proved_count"],
        "g2_remaining": results["g2_normalized"]["remaining_count"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
