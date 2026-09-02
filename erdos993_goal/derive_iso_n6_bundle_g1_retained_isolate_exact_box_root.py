#!/usr/bin/env python3
"""Derive the exact rectangular lower for the retained-isolate rank-six G1 gap.

For a fixed full marked forest C, the retained-isolate increment is affine in
the W/A/B/Z occupation categories D_i of the induced minor:

    Delta(C,D) = B(C) + sum_i D_i L_i(C).

Each D_i lies between zero and both (a) the matching full-forest category C_i
and (b) the corresponding binomial category budget K_i(t), where t is the
number of retained unmarked vertices.  Therefore

    Delta(C,D) >= B(C) + sum_i min(C_i,K_i(t))*min(L_i(C),0).

The identity and the box implication are exact.  Positivity of the displayed
piecewise lower remains a separate theorem target.
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
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_exact_box_root_20260901.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_EXACT_BOX_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_integer(variable: sp.Symbol, rank: int) -> sp.Expr:
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(variable - offset for offset in range(rank)) / math.factorial(rank)


def polynomial_summary(expression: sp.Expr) -> dict[str, object]:
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
    return {
        "terms": len(terms),
        "negative_scalar_coefficients": sum(
            coefficient.is_negative is True for coefficient in coefficients
        ),
        "minimum_scalar_coefficient": str(min(coefficients, default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def build():
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
    dlinear = all(sp.diff(expression, left, right) == 0 for left in dvars for right in dvars)
    if not dlinear:
        raise RuntimeError("target unexpectedly nonlinear in D categories")

    t = sp.Symbol("t", integer=True, nonnegative=True)
    branches = {}
    for geometry in ("adjacent", "nonadjacent"):
        for uvalue in (0, 1):
            for vvalue in (0, 1):
                fixed = {eu: uvalue, ev: vvalue, q: t + uvalue + vvalue}
                if geometry == "adjacent":
                    for rank in range(2, 8):
                        for prefix in ("C", "D"):
                            symbol = names.get(f"{prefix}Z{rank}")
                            if symbol is not None:
                                fixed[symbol] = 0
                branch = sp.expand(expression.subs(fixed))
                branch_dvars = tuple(symbol for symbol in dvars if symbol in branch.free_symbols)
                base = sp.expand(branch.subs({symbol: 0 for symbol in branch_dvars}))
                affine_reconstruction = base
                lower = base
                derivative_rows = {}
                for dvar in branch_dvars:
                    derivative = sp.expand(sp.diff(branch, dvar))
                    affine_reconstruction += dvar * derivative
                    family = str(dvar)[1]
                    rank = int(str(dvar)[2:])
                    containment_cap = names["C" + str(dvar)[1:]]
                    if family == "W":
                        cardinality_cap = choose_integer(t, rank)
                    elif family == "A":
                        cardinality_cap = vvalue * choose_integer(t, rank - 1)
                    elif family == "B":
                        cardinality_cap = uvalue * choose_integer(t, rank - 1)
                    elif family == "Z":
                        cardinality_cap = uvalue * vvalue * choose_integer(t, rank - 2)
                    else:
                        raise RuntimeError(f"unknown category family {family}")
                    upper = sp.Min(containment_cap, cardinality_cap)
                    lower += upper * sp.Min(derivative, 0)
                    derivative_rows[str(dvar)] = {
                        "derivative_expression": str(sp.factor(derivative)),
                        "derivative_summary": polynomial_summary(derivative),
                        "containment_cap": str(containment_cap),
                        "cardinality_cap": str(sp.factor(cardinality_cap)),
                    }
                affine_identity = sp.expand(branch - affine_reconstruction) == 0
                if not affine_identity:
                    raise RuntimeError(f"affine reconstruction failed in {geometry} {uvalue} {vvalue}")
                label = f"{geometry}_u{uvalue}_v{vvalue}"
                branches[label] = {
                    "affine_identity_exact": affine_identity,
                    "base_expression": str(base),
                    "base_summary": polynomial_summary(base),
                    "derivative_rows": derivative_rows,
                    "exact_box_lower_expression": str(lower),
                    "piecewise_blocks": len(derivative_rows),
                    "expression_sha256": hashlib.sha256(sp.srepr(lower).encode()).hexdigest().upper(),
                }
    return expression, dlinear, t, branches


def main() -> None:
    expression, dlinear, _, branches = build()
    report = {
        "marker": MARKER,
        "target": "G1_6((1+x)C,(1+x)D)-G1_6(C,D)",
        "exact_D_linearity": dlinear,
        "full_expression_summary": polynomial_summary(expression),
        "exact_box_lemma": (
            "If 0<=D_i<=U_i for every affine coordinate, then "
            "B+sum D_i*L_i >= B+sum U_i*min(L_i,0). Here "
            "U_i=min(C_i,K_i(t))."
        ),
        "unmarked_minor_order": "t=q-epsilon_u-epsilon_v is a nonnegative integer",
        "branches": branches,
        "status": "exact lower reduction derived; universal nonnegativity remains open",
        "scope_guard": (
            "The affine identities and lower implication are exact. The report does not "
            "assert that the piecewise lower is universally nonnegative."
        ),
        "dependencies_sha256": {
            "audit_iso_n6_bundle_g6_g2_transfer_audit.py": sha256(
                HERE / "audit_iso_n6_bundle_g6_g2_transfer_audit.py"
            ),
            "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py": sha256(
                HERE / "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py"
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
        "exact_D_linearity": dlinear,
        "branches": {
            label: {
                "affine_identity_exact": row["affine_identity_exact"],
                "piecewise_blocks": row["piecewise_blocks"],
                "base_summary": row["base_summary"],
                "expression_sha256": row["expression_sha256"],
            }
            for label, row in branches.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
