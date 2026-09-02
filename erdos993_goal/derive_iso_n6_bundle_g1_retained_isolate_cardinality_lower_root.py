#!/usr/bin/env python3
"""Exact minor-cardinality lower for the retained-isolate rank-six G1 gap.

The target is linear in the induced-minor W/A/B/Z occupation categories.
After discarding coefficientwise-positive pieces of each derivative, bound the
remaining negative piece using the number t of unmarked retained vertices:

  DW_r <= binom(t,r),
  DA_r <= epsilon_v binom(t,r-1),
  DB_r <= epsilon_u binom(t,r-1),
  DZ_r <= epsilon_u epsilon_v binom(t,r-2).

These are valid for every induced minor.  They complement (rather than assume)
the category-containment cap used by the preceding coarse diagnostic.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_cardinality_lower_exact_root_20260901.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_CARDINALITY_LOWER_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def negative_part(expression: sp.Expr) -> sp.Expr:
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    if not variables:
        return expression if expression.is_negative is True else sp.Integer(0)
    answer = sp.Integer(0)
    for powers, coefficient in sp.Poly(expression, *variables).terms():
        if coefficient < 0:
            term = sp.Integer(coefficient)
            for variable, power in zip(variables, powers):
                term *= variable**power
            answer += term
    return sp.expand(answer)


def choose_integer(variable: sp.Symbol, rank: int) -> sp.Expr:
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(variable - offset for offset in range(rank)) / math.factorial(rank)


def summary(expression: sp.Expr, basis_variable: sp.Symbol | None = None) -> dict[str, object]:
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    if variables:
        polynomial = sp.Poly(expression, *variables)
        coefficients = polynomial.coeffs()
        terms = polynomial.terms()
    elif expression == 0:
        coefficients, terms = [], []
    else:
        coefficients, terms = [expression], [((), expression)]
    row = {
        "terms_standard_basis": len(terms),
        "negative_scalar_coefficients_standard_basis": sum(
            coefficient.is_negative is True for coefficient in coefficients
        ),
        "minimum_scalar_coefficient_standard_basis": str(min(coefficients, default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }
    if basis_variable is not None:
        degree = sp.degree(expression, basis_variable)
        row["degree_in_unmarked_minor_order"] = int(degree) if degree is not sp.S.NegativeInfinity else -1
    return row


def main() -> None:
    g1 = reconstruct(1)
    cgeneric = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    dgeneric = tuple(tuple(sp.symbols(f"d{family}0:8")) for family in "EUVW")
    target = sp.expand(
        substitute(g1, isolate_multiply(cgeneric, 1), isolate_multiply(dgeneric, 1))
        - substitute(g1, cgeneric, dgeneric)
    )

    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v", integer=True, nonnegative=True)
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
    cpart, _ = partition_substitution("C", "c", 7)
    dpart, _ = partition_substitution("D", "d", 7)
    expression = sp.expand(target.subs(structural).subs(cpart).subs(dpart))
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")), key=str
    ))
    if not all(sp.diff(expression, left, right) == 0 for left in dvars for right in dvars):
        raise RuntimeError("target unexpectedly nonlinear in D categories")

    branches = {}
    t = sp.Symbol("t", integer=True, nonnegative=True)
    for geometry in ("adjacent", "nonadjacent"):
        for uvalue in (0, 1):
            for vvalue in (0, 1):
                fixed = {eu: uvalue, ev: vvalue, q: t + uvalue + vvalue}
                if geometry == "adjacent":
                    for rank in range(2, 8):
                        csymbol = names.get(f"CZ{rank}")
                        dsymbol = names.get(f"DZ{rank}")
                        if csymbol is not None:
                            fixed[csymbol] = 0
                        if dsymbol is not None:
                            fixed[dsymbol] = 0
                branch_expression = sp.expand(expression.subs(fixed))
                branch_dvars = tuple(
                    symbol for symbol in dvars if symbol in branch_expression.free_symbols
                )
                lower = sp.expand(branch_expression.subs({symbol: 0 for symbol in branch_dvars}))
                derivative_rows = {}
                for dvar in branch_dvars:
                    derivative = sp.expand(sp.diff(branch_expression, dvar))
                    negative = negative_part(derivative)
                    family = str(dvar)[1]
                    rank = int(str(dvar)[2:])
                    if family == "W":
                        cap = choose_integer(t, rank)
                    elif family == "A":
                        cap = vvalue * choose_integer(t, rank - 1)
                    elif family == "B":
                        cap = uvalue * choose_integer(t, rank - 1)
                    elif family == "Z":
                        cap = uvalue * vvalue * choose_integer(t, rank - 2)
                    else:
                        raise RuntimeError(f"unknown family {family}")
                    lower += negative * cap
                    derivative_rows[str(dvar)] = {
                        "negative_part_expression": str(sp.factor(negative)),
                        "cardinality_cap": str(sp.factor(cap)),
                    }
                lower = sp.expand(lower)
                label = f"{geometry}_u{uvalue}_v{vvalue}"
                branches[label] = {
                    **summary(lower, t),
                    "expression": str(lower),
                    "derivative_rows": derivative_rows,
                }

    report = {
        "marker": MARKER,
        "target": "G1_6((1+x)C,(1+x)D)-G1_6(C,D)",
        "unmarked_minor_order": "t=q-epsilon_u-epsilon_v",
        "minor_category_caps": {
            "DW_r": "binomial(t,r)",
            "DA_r": "epsilon_v*binomial(t,r-1)",
            "DB_r": "epsilon_u*binomial(t,r-1)",
            "DZ_r": "epsilon_u*epsilon_v*binomial(t,r-2), and zero for adjacent marks",
        },
        "branches": branches,
        "scope_guard": (
            "Each branch is a valid lower bound using minor cardinality alone. Negative "
            "coefficients or values obstruct only this relaxation, not the target inequality."
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
        "branches": {
            label: {key: value for key, value in row.items() if key not in ("expression", "derivative_rows")}
            for label, row in branches.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
