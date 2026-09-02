#!/usr/bin/env python3
"""Exact singleton-ordinary specialization of the rank-six g1 leaf split.

For the canonical singleton-ordinary mode the induced row is D=C-p.  Delete
an ordinary leaf ell with parent s, both distinct from p and the marks.  In
the parent/leaf-retained branch of the general identity, J=H-p.  If p is in
K then L=K-p; otherwise L=K.  This source rewrites the complete leaf delta
as a no-parent g2 baseline plus a residual in H,K and linear singleton-parent
loss corrections.  It is a reduction only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_g2_parent_loss_split_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "DERIVED_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_G2_"
    "PARENT_LOSS_SPLIT_G1_NONADJACENT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def summary(expression: sp.Expr) -> dict[str, object]:
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    ranks = [int(str(symbol)[-1]) for symbol in variables]
    return {
        "terms": len(polynomial.terms()),
        "maximum_row_rank": max(ranks, default=None),
        "negative_scalar_coefficients": sum(
            1 for coefficient in polynomial.coeffs() if coefficient < 0
        ),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs(), default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main() -> None:
    components = build_expressions()
    hrows, krows, jrows, lrows = (symbolic_rows(prefix) for prefix in "HKJL")
    prows, qrows = (symbolic_rows(prefix) for prefix in "PQ")
    full11 = sp.expand(
        components["g2"] + components["F"] + components["QHL"]
        + components["QHJ"] + components["QKJ"] + components["T"]
    )
    rules = {}
    for jrow, hrow, prow in zip(jrows, hrows, prows):
        rules.update({jvalue: hvalue - pvalue for jvalue, hvalue, pvalue in zip(jrow, hrow, prow)})
    for lrow, krow, qrow in zip(lrows, krows, qrows):
        rules.update({lvalue: kvalue - qvalue for lvalue, kvalue, qvalue in zip(lrow, krow, qrow)})
    retained_p = sp.expand(full11.subs(rules))
    qsymbols = tuple(value for row in qrows for value in row)
    psymbols = tuple(value for row in prows for value in row)
    absent_p = sp.expand(retained_p.subs({value: 0 for value in qsymbols}))
    baseline = sp.expand(absent_p.subs({value: 0 for value in psymbols}))
    p_correction = sp.expand(absent_p - baseline)
    q_correction = sp.expand(retained_p - absent_p)

    active_p = tuple(sorted(p_correction.free_symbols & set(psymbols), key=str))
    active_q = tuple(sorted(q_correction.free_symbols & set(qsymbols), key=str))
    assert sp.Poly(p_correction, *active_p).total_degree() == 1
    assert sp.Poly(q_correction, *active_q).total_degree() == 1
    assert not (set(active_q) & p_correction.free_symbols)
    assert not (set(active_p) & q_correction.free_symbols)
    assert sp.expand(absent_p - baseline - p_correction) == 0
    assert sp.expand(retained_p - baseline - p_correction - q_correction) == 0

    no_parent_g2 = sp.expand(components["g2"].subs({
        jvalue: hvalue for jrow, hrow in zip(jrows, hrows)
        for jvalue, hvalue in zip(jrow, hrow)
    }))
    baseline_residual = sp.expand(baseline - no_parent_g2)
    assert all(not str(symbol).startswith(("J", "L", "P", "Q")) for symbol in baseline.free_symbols)

    p_coefficients = {
        str(variable): str(sp.factor(sp.diff(p_correction, variable)))
        for variable in active_p
    }
    q_coefficients = {
        str(variable): str(sp.factor(sp.diff(q_correction, variable)))
        for variable in active_q
    }
    report = {
        "marker": MARKER,
        "canonical_mode": "singleton_ordinary",
        "geometry": {
            "target": "g1_6(C,C-p;u,v)",
            "leaf": "ell is an unmarked leaf with ordinary parent s; ell,s,p,u,v are distinct",
            "recursive_rows": "H=(C-ell)-s, K=(C-ell)-N[s], J=H-p",
            "p_not_in_K": "L=K",
            "p_in_K": "L=K-p",
        },
        "exact_identities": {
            "p_not_in_K": "Delta11=g2_6(H,H)+R0(H,K)+Pcor(H,K;P)",
            "p_in_K": "Delta11=g2_6(H,H)+R0(H,K)+Pcor(H,K;P)+Qcor(H;Q)",
            "P_semantics": "P_F,r counts H-category F independent r-sets containing p",
            "Q_semantics": "Q_F,r counts K-category F independent r-sets containing p",
        },
        "active_parent_loss_variables": {
            "P": [str(value) for value in active_p],
            "Q": [str(value) for value in active_q],
        },
        "parent_loss_coefficients": {
            "P": p_coefficients,
            "Q": q_coefficients,
        },
        "summaries": {
            "no_parent_g2_H_H": summary(no_parent_g2),
            "baseline_residual_R0_H_K": summary(baseline_residual),
            "P_correction": summary(p_correction),
            "Q_correction": summary(q_correction),
            "complete_p_not_in_K": summary(absent_p),
            "complete_p_in_K": summary(retained_p),
        },
        "checks": {
            "both_symbolic_identities_zero": True,
            "P_correction_linear": True,
            "Q_correction_linear": True,
            "P_Q_corrections_separate": True,
            "baseline_contains_no_loss_variables": True,
        },
        "status": (
            "exact canonical specialization only; signs of R0 and the complete sums remain open"
        ),
        "scope_guard": (
            "This does not assert leaf monotonicity, singleton-ordinary g1, all-five-mode g1, N6, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "active_parent_loss_variables": report["active_parent_loss_variables"],
        "summaries": report["summaries"],
        "checks": report["checks"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
