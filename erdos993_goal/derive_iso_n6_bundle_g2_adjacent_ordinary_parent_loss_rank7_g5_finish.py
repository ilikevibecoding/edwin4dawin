#!/usr/bin/env python3
"""Exact parent-loss normal form for adjacent ordinary-parent rank-six g2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution, structural_substitution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_parent_loss_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT_LOSS_RANK7_G5_FINISH"


def summary(value):
    polynomial = sp.Poly(value, *sorted(value.free_symbols, key=str))
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(1 for coefficient in polynomial.coeffs() if coefficient < 0),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "sha256": hashlib.sha256(str(value).encode()).hexdigest().upper(),
    }


def main():
    structural, _ = structural_substitution()
    cp, _ = partition_substitution("C", "c", 7)
    dp, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cp).subs(dp))
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    dvars = tuple(sorted((symbol for symbol in expression.free_symbols if str(symbol).startswith("D")), key=str))
    adjacent = {names[f"CZ{rank}"]: 0 for rank in range(2, 8) if f"CZ{rank}" in names}
    no_parent_rules = {variable: names["C"+str(variable)[1:]] for variable in dvars}
    no_parent = sp.expand(expression.subs(no_parent_rules).subs(adjacent))

    pvars = {}
    ordinary_rules = {}
    for variable in dvars:
        label = str(variable)[1:]
        pvar = sp.Symbol("P"+label, integer=True, nonnegative=True)
        pvars[label] = pvar
        ordinary_rules[variable] = names["C"+label] - pvar
    ordinary = sp.expand(expression.subs(ordinary_rules).subs(adjacent).subs({pvars[f"Z{r}"]: 0 for r in range(2, 7) if f"Z{r}" in pvars}))
    correction = sp.expand(ordinary-no_parent)
    active_pvars = tuple(sorted((symbol for symbol in correction.free_symbols if str(symbol).startswith("P")), key=str))
    assert sp.Poly(correction, *active_pvars).total_degree() == 1

    a = sp.symbols("a0:8", integer=True, nonnegative=True)
    b = sp.symbols("b0:7", integer=True, nonnegative=True)
    c = sp.symbols("c0:7", integer=True, nonnegative=True)
    occupation = {names["n"]: a[1]+2}
    for rank in range(2, 8):
        occupation[names[f"CW{rank}"]] = a[rank]
        occupation[names[f"CA{rank}"]] = b[rank-1]
        occupation[names[f"CB{rank}"]] = c[rank-1]
    correction_occupation = sp.expand(correction.subs(occupation))
    coefficients = {str(variable): str(sp.factor(sp.diff(correction_occupation, variable))) for variable in active_pvars}
    assert sp.expand(correction_occupation - sum(variable*sp.diff(correction_occupation, variable) for variable in active_pvars)) == 0
    coefficient_expr = {str(variable): sp.expand(sp.diff(correction_occupation, variable)) for variable in active_pvars}
    m = a[1]
    cap_a4 = (m-2)/2
    cap_a5 = (m-2)*(m-3)/6
    cap_w3 = (m-2)/2
    cap_w4 = (m-2)*(m-3)/6
    shadow_base = {
        "K_A": sp.factor(coefficient_expr["PA3"] + cap_a4*coefficient_expr["PA4"] + cap_a5*coefficient_expr["PA5"]),
        "K_B": sp.factor(coefficient_expr["PB3"] + cap_a4*coefficient_expr["PB4"] + cap_a5*coefficient_expr["PB5"]),
        "K_W": sp.factor(coefficient_expr["PW2"] + cap_w3*coefficient_expr["PW3"] + cap_w4*coefficient_expr["PW4"]),
    }

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "scope": "adjacent marks u,v; ordinary deleted parent p distinct from u,v",
        "semantics": "PFk counts C-category F independent k-sets containing p; DFk=CFk-PFk exactly",
        "identity": "g2(C,C-p;u,v)=g2(C,C;u,v)+correction",
        "active_parent_loss_variables": [str(variable) for variable in active_pvars],
        "correction_coefficients_in_occupation_rows": coefficients,
        "downward_shadow_caps": {
            "PA4_over_PA3": str(cap_a4),
            "PA5_over_PA3": str(cap_a5),
            "PB4_over_PB3": str(cap_a4),
            "PB5_over_PB3": str(cap_a5),
            "PW3_over_PW2": str(cap_w3),
            "PW4_over_PW2": str(cap_w4),
        },
        "shadow_base_coefficients_if_middle_coefficients_nonpositive": {
            label: str(value) for label, value in shadow_base.items()
        },
        "correction": str(sp.factor(correction_occupation)),
        "summaries": {
            "no_parent": summary(no_parent.subs(occupation)),
            "ordinary_parent": summary(ordinary.subs(occupation)),
            "correction": summary(correction_occupation),
        },
        "status": "exact ordinary-parent loss algebra; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "active": report["active_parent_loss_variables"], "coefficients": coefficients, "summaries": report["summaries"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
