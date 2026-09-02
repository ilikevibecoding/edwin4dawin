#!/usr/bin/env python3
"""Reconstruct the rank-five whole-bundle coefficient g5 in forest invariants.

This is an exact algebraic reduction.  C is a two-marked forest on n vertices,
and D is an induced subforest on q vertices.  The survival indicators eu,ev
record whether the protected marks u,v remain in D.  C is needed through i3
and D only through i2.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import c2, c3, i2, i3
from derive_iso_n4_bundle_polynomial_root import (
    add_xd,
    binomial_basis,
    isolate_multiply,
    nested_rank,
)


HERE = Path(__file__).resolve().parent
ROOT_REPORT = HERE / "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g5_forest_invariant_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def derive_raw_g5() -> sp.Expr:
    """Independently reconstruct coefficient of binom(M,5)."""
    rank = 5
    maximum = rank + 1
    m, t = sp.symbols("M t", integer=True, nonnegative=True)
    crows = tuple(tuple(sp.symbols(f"c{name}0:{maximum + 1}")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:{maximum + 1}")) for name in "EUVW")
    tm = add_xd(isolate_multiply(crows, m, maximum), drows)
    t0 = add_xd(crows, drows)
    ct = isolate_multiply(crows, t, rank)
    lower = nested_rank(ct, rank - 1)
    lower_polynomial = sp.Poly(lower, t)
    lower_sum = sp.expand(
        sum(
            coefficient
            * (sp.bernoulli(power + 1, m) - sp.bernoulli(power + 1, 0))
            / (power + 1)
            for (power,), coefficient in lower_polynomial.terms()
        )
    )
    gamma = sp.expand(
        nested_rank(tm, rank) - nested_rank(t0, rank) - lower_sum
    )
    return sp.expand(binomial_basis(gamma, m)[5])


def invariant_substitution() -> tuple[dict[sp.Symbol, sp.Expr], tuple[sp.Symbol, ...]]:
    n, q = sp.symbols("n q", integer=True, nonnegative=True)
    eu, ev = sp.symbols("epsilon_u epsilon_v", integer=True, nonnegative=True)
    e, du, dv, a = sp.symbols(
        "C_edges C_degree_u C_degree_v C_adjacent",
        integer=True,
        nonnegative=True,
    )
    wedges, xu, xv, common = sp.symbols(
        "C_wedges C_neighbor_excess_u C_neighbor_excess_v C_common_neighbor",
        integer=True,
        nonnegative=True,
    )
    de, ddu, ddv, da = sp.symbols(
        "D_edges D_degree_u D_degree_v D_adjacent",
        integer=True,
        nonnegative=True,
    )

    cue = e - du
    cve = e - dv
    cwe = e - du - dv + a
    cuw = wedges - c2(du) - xu
    cvw = wedges - c2(dv) - xv
    cww = (
        wedges
        - c2(du)
        - c2(dv)
        - xu
        - xv
        + a * (du + dv - 2)
        + common
    )
    substitution = {
        **{sp.Symbol(f"c{name}0"): 1 for name in "EUVW"},
        **{sp.Symbol(f"d{name}0"): 1 for name in "EUVW"},
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q,
        sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev,
        sp.Symbol("dW1"): q - eu - ev,
        sp.Symbol("cE2"): i2(n, e),
        sp.Symbol("cU2"): i2(n - 1, cue),
        sp.Symbol("cV2"): i2(n - 1, cve),
        sp.Symbol("cW2"): i2(n - 2, cwe),
        sp.Symbol("cE3"): i3(n, e, wedges),
        sp.Symbol("cU3"): i3(n - 1, cue, cuw),
        sp.Symbol("cV3"): i3(n - 1, cve, cvw),
        sp.Symbol("cW3"): i3(n - 2, cwe, cww),
        sp.Symbol("dU2"): i2(q - eu, de - ddu),
        sp.Symbol("dV2"): i2(q - ev, de - ddv),
        sp.Symbol("dW2"): i2(q - eu - ev, de - ddu - ddv + da),
    }
    variables = (
        n, q, eu, ev, e, du, dv, a, wedges, xu, xv, common,
        de, ddu, ddv, da,
    )
    return substitution, variables


def main() -> None:
    root = json.loads(ROOT_REPORT.read_text(encoding="utf-8"))
    assert root["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    raw = derive_raw_g5()
    frozen_raw = sp.sympify(root["binomial_coefficients"][5]["factor"])
    assert sp.expand(raw - frozen_raw) == 0

    substitution, variables = invariant_substitution()
    expression = sp.factor(raw.subs(substitution))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert len(polynomial.terms()) == 35

    report = {
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G5_FOREST_INVARIANT_REDUCTION_AGENT",
        "identity": "g5=[binom(M,5)] Gamma_M",
        "raw_form": str(sp.factor(raw)),
        "forest_invariant_form": str(expression),
        "expanded_term_count": len(polynomial.terms()),
        "negative_scalar_coefficient_count": sum(
            int(coefficient.is_negative is True)
            for _, coefficient in polynomial.terms()
        ),
        "invariants": {
            "C": (
                "n,C_edges,C_degree_u,C_degree_v,C_adjacent,C_wedges,"
                "C_neighbor_excess_u,C_neighbor_excess_v,C_common_neighbor"
            ),
            "D": (
                "q,epsilon_u,epsilon_v,D_edges,D_degree_u,D_degree_v,D_adjacent"
            ),
            "survival_convention": (
                "epsilon_z=1 iff protected mark z survives in D; its D-degree "
                "is zero otherwise"
            ),
        },
        "minor_wedge_identity": (
            "W(C-u-v)=W-C(du,2)-C(dv,2)-Xu-Xv"
            "+a(du+dv-2)+common(u,v)"
        ),
        "scope": (
            "Exact 35-term forest-invariant reduction for rank-five whole-bundle "
            "g5 only. No sign theorem is asserted."
        ),
        "dependencies": {ROOT_REPORT.name: sha256(ROOT_REPORT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "forest_invariant_form": report["forest_invariant_form"],
        "expanded_term_count": report["expanded_term_count"],
        "negative_scalar_coefficient_count": report["negative_scalar_coefficient_count"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
