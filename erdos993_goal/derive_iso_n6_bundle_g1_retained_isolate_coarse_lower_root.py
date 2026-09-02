#!/usr/bin/env python3
"""Coarse exact containment lower for the retained-isolate rank-six G1 gap.

The target is linear in the induced-minor occupation rows D.  For each D
coordinate, split its derivative into nonnegative- and negative-coefficient
parts on the full-forest occupation rows C.  Since 0<=D_F,r<=C_F,r, dropping
the positive part and replacing D by C in the negative part is a valid lower
bound.  The resulting full-row polynomial is then inspected against the
standard consecutive independent-set caps.  This is a diagnostic unless all
sign preconditions and the reduced polynomial close.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_lower_exact_root_20260901.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_COARSE_LOWER_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def negative_part(expression: sp.Expr) -> sp.Expr:
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    if not variables:
        return expression if expression.is_negative is True else sp.Integer(0)
    out = sp.Integer(0)
    for powers, coefficient in sp.Poly(expression, *variables).terms():
        if coefficient < 0:
            term = sp.Integer(coefficient)
            for variable, power in zip(variables, powers):
                term *= variable**power
            out += term
    return sp.expand(out)


def polynomial_summary(expression: sp.Expr) -> dict[str, object]:
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    if variables:
        polynomial = sp.Poly(expression, *variables)
        terms = polynomial.terms()
        coefficients = polynomial.coeffs()
    elif expression == 0:
        terms = []
        coefficients = []
    else:
        terms = [((), expression)]
        coefficients = [expression]
    return {
        "terms": len(terms),
        "negative_scalar_coefficients": sum(
            value.is_negative is True for value in coefficients
        ),
        "minimum_scalar_coefficient": str(min(coefficients, default=0)),
        "polynomial_sha256": hashlib.sha256(
            sp.srepr(expression).encode()
        ).hexdigest().upper(),
    }


def main() -> None:
    g1 = reconstruct(1)
    cgeneric = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    dgeneric = tuple(tuple(sp.symbols(f"d{family}0:8")) for family in "EUVW")
    target = sp.expand(
        substitute(g1, isolate_multiply(cgeneric, 1), isolate_multiply(dgeneric, 1))
        - substitute(g1, cgeneric, dgeneric)
    )

    n, q, eu, ev = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {
        sp.Symbol(f"{prefix}{family}0"): 1
        for prefix in ("c", "d") for family in "EUVW"
    }
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q,
        sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev,
        sp.Symbol("dW1"): q - eu - ev,
    })
    cpart, crows = partition_substitution("C", "c", 7)
    dpart, drows = partition_substitution("D", "d", 7)
    expression = sp.expand(target.subs(structural).subs(cpart).subs(dpart))

    names = {str(symbol): symbol for symbol in expression.free_symbols}
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    second_derivatives_zero = all(
        sp.diff(expression, left, right) == 0 for left in dvars for right in dvars
    )
    if not second_derivatives_zero:
        raise RuntimeError("target unexpectedly nonlinear in D categories")

    lower = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
    derivative_rows = {}
    for dvar in dvars:
        derivative = sp.expand(sp.diff(expression, dvar))
        negative = negative_part(derivative)
        cap = names["C" + str(dvar)[1:]]
        lower += negative * cap
        derivative_rows[str(dvar)] = {
            "derivative": polynomial_summary(derivative),
            "negative_part": polynomial_summary(negative),
            "derivative_expression": str(sp.factor(derivative)),
            "negative_part_expression": str(sp.factor(negative)),
            "cap": str(cap),
        }
    lower = sp.expand(lower)

    # Branch the two mark geometries and four minor mark-retention masks.
    branches = {}
    for geometry in ("adjacent", "nonadjacent"):
        for uvalue in (0, 1):
            for vvalue in (0, 1):
                rules = {eu: uvalue, ev: vvalue}
                if geometry == "adjacent":
                    for rank in range(2, 8):
                        symbol = names.get(f"CZ{rank}")
                        if symbol is not None:
                            rules[symbol] = 0
                branch = sp.expand(lower.subs(rules))
                branches[f"{geometry}_u{uvalue}_v{vvalue}"] = {
                    **polynomial_summary(branch),
                    "expression": str(branch),
                }

    report = {
        "marker": MARKER,
        "target": "G1_6((1+x)C,(1+x)D)-G1_6(C,D)",
        "exact_D_linearity": second_derivatives_zero,
        "containment_lower_rule": (
            "For each D category derivative L(C), keep only its negative-coefficient "
            "part L_-(C) and use D<=C, giving D*L(C)>=C*L_-(C)."
        ),
        "expression_summary": polynomial_summary(expression),
        "coarse_lower_summary": polynomial_summary(lower),
        "coarse_lower_expression": str(lower),
        "branches": branches,
        "derivative_rows": derivative_rows,
        "next_step": (
            "Apply sign-checked consecutive-set caps and forest edge/marked-neighbour "
            "constraints to the coarse lower; negative scalar coefficients here are "
            "relaxation obstructions, not forest witnesses."
        ),
        "scope_guard": (
            "This report is a valid algebraic lower reduction but does not assert that "
            "the resulting polynomial is nonnegative on all forest rows."
        ),
        "dependencies_sha256": {
            "audit_iso_n6_bundle_g6_g2_transfer_audit.py": sha256(
                HERE / "audit_iso_n6_bundle_g6_g2_transfer_audit.py"
            ),
            "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py": sha256(
                HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py"
            ),
            "explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent.py": sha256(
                HERE / "explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "D_linear": second_derivatives_zero,
        "expression": report["expression_summary"],
        "coarse_lower": report["coarse_lower_summary"],
        "branches": branches,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
