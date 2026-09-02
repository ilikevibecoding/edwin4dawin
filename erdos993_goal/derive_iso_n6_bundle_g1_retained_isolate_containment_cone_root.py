#!/usr/bin/env python3
"""Exact marked-category containment cone for the retained-isolate G1 gap.

The full forest A contains an actual induced marked minor B.  In W/A/B/Z
occupation coordinates, every independent set of B is also one of A in the
same mark-occupation class.  Hence write each full category as D+X, where D
is the minor category and X is its nonnegative loss.  This script tests the
complete coupled retained-isolate increment on that exact containment cone,
branching over the four possible mark-retention masks and both mark
geometries.  Coefficientwise positivity would be a universal proof; negative
free-cone coefficients are only relaxation obstructions.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_containment_cone_exact_root_20260901.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_CONTAINMENT_CONE_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def occupation_rows(prefix: str):
    categories = {
        family: tuple(
            sp.Symbol(f"{prefix}{family}{rank}", integer=True, nonnegative=True)
            for rank in range(8)
        )
        for family in "WABZ"
    }
    rows = []
    for rank in range(8):
        w, a, b, z = (categories[family][rank] for family in "WABZ")
        rows.append((w + a + b + z, w + a, w + b, w))
    return tuple(tuple(row[family] for row in rows) for family in range(4)), categories


def add_category_rows(left, right):
    return tuple(
        tuple(sp.expand(a + b) for a, b in zip(left_row, right_row))
        for left_row, right_row in zip(left, right)
    )


def summary(expression: sp.Expr):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    negatives = []
    for powers, coefficient in polynomial.terms():
        if coefficient < 0 and len(negatives) < 20:
            monomial = sp.Integer(coefficient)
            for variable, power in zip(variables, powers):
                monomial *= variable**power
            negatives.append(str(monomial))
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            value.is_negative is True for value in coefficients
        ),
        "minimum_scalar_coefficient": str(min(coefficients, default=0)),
        "first_negative_terms": negatives,
        "polynomial_sha256": hashlib.sha256(sp.srepr(sp.expand(expression)).encode()).hexdigest().upper(),
    }


def main() -> None:
    drows, dcats = occupation_rows("D")
    xrows, xcats = occupation_rows("X")
    arows = add_category_rows(drows, xrows)
    g1 = reconstruct(1)
    target = sp.expand(
        substitute(g1, isolate_multiply(arows, 1), isolate_multiply(drows, 1))
        - substitute(g1, arows, drows)
    )

    base_rules = {}
    # Every nonempty forest row has constant term one; occupation constants
    # are W0=1 and A0=B0=Z0=0.  The containment loss at rank zero is zero.
    for family in "WABZ":
        base_rules[dcats[family][0]] = 1 if family == "W" else 0
        base_rules[xcats[family][0]] = 0
    # No rank-one independent set contains both distinct marks.
    base_rules[dcats["Z"][1]] = 0
    base_rules[xcats["Z"][1]] = 0

    branches = {}
    for geometry in ("adjacent", "nonadjacent"):
        for retain_u in (0, 1):
            for retain_v in (0, 1):
                rules = dict(base_rules)
                # A means v-only and B means u-only.
                rules.update({
                    dcats["A"][1]: retain_v,
                    xcats["A"][1]: 1 - retain_v,
                    dcats["B"][1]: retain_u,
                    xcats["B"][1]: 1 - retain_u,
                })
                if geometry == "adjacent":
                    for rank in range(2, 8):
                        rules[dcats["Z"][rank]] = 0
                        rules[xcats["Z"][rank]] = 0
                reduced = sp.expand(target.subs(rules))
                label = f"{geometry}_u{retain_u}_v{retain_v}"
                branches[label] = summary(reduced)

    all_nonnegative = all(
        row["negative_scalar_coefficients"] == 0 for row in branches.values()
    )
    report = {
        "marker": MARKER,
        "target": "G1_6((1+x)A,(1+x)B)-G1_6(A,B)",
        "cone": (
            "For every W/A/B/Z rank category, A_category=D_category+X_category; "
            "D is the actual induced minor category and X is the nonnegative loss."
        ),
        "branches": branches,
        "all_scalar_coefficients_nonnegative": all_nonnegative,
        "status": (
            "PASS coefficientwise containment proof"
            if all_nonnegative else
            "exact diagnostic; categorywise containment cone alone is insufficient"
        ),
        "scope_guard": (
            "If negative coefficients remain, they are relaxation corners and not forest "
            "counterexamples. If all coefficients are nonnegative, the checked exact "
            "category containment is sufficient for the retained-isolate family only."
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
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "all_nonnegative": all_nonnegative,
        "branches": {
            key: {
                "terms": value["terms"],
                "negative": value["negative_scalar_coefficients"],
                "minimum": value["minimum_scalar_coefficient"],
            }
            for key, value in branches.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
