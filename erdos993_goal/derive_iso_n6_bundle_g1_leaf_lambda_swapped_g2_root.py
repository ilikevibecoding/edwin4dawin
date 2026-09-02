#!/usr/bin/env python3
"""Exact swapped-G2 identity for the ordinary-parent retention payment.

The identity is useful only as a reduction.  The swapped second argument is a
superforest, so the existing G2 theorem for actual induced minors does not
apply.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    add_leaf,
    substitute,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_lambda_swapped_g2_exact_root_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_LEAF_LAMBDA_SWAPPED_G2_ROOT"
PINS = {
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "derive_iso_n6_bundle_g1_leaf_retention_polarization_targets_agent.py":
        "D2A5FFD36BCD13956751DE3B639138EC87E2615ECFD1AF965D820F116E7733E3",
    "iso_n6_bundle_g1_leaf_retention_polarization_targets_exact_agent_20260831.json":
        "CF37A90A82443D00F9D0A7938731E47F32A606950475B70F5BB1AFAF92CF328F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def zeros():
    return tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")


def summary(expression):
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(1 for value in polynomial.coeffs() if value < 0),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main() -> None:
    for name, expected in PINS.items():
        actual = sha256(HERE / name)
        require(actual == expected, f"dependency hash mismatch for {name}: {actual}")

    g1, g2 = reconstruct(1), reconstruct(2)
    crows, jrows = rows("C"), rows("J")
    zrows = zeros()
    xjrows = add_leaf(zrows, jrows)

    lambda_expression = sp.expand(
        substitute(g1, crows, xjrows) - substitute(g1, crows, zrows)
    )
    swapped_g2_polarization = sp.expand(
        substitute(g2, jrows, crows) - substitute(g2, jrows, zrows)
    )
    unswapped_g2_polarization = sp.expand(
        substitute(g2, crows, jrows) - substitute(g2, crows, zrows)
    )
    require(sp.expand(lambda_expression - swapped_g2_polarization) == 0,
            "swapped G2 identity failed")
    unswapped_gap = sp.expand(lambda_expression - unswapped_g2_polarization)
    require(unswapped_gap != 0, "unswapped orientation unexpectedly equal")

    report = {
        "marker": MARKER,
        "identity": "P6(C,xJ)=g2_6(J,C)-g2_6(J,0)",
        "operator_derivation": (
            "Writing I=1+x and B6 for the symmetric bilinear polarization of the "
            "quadratic N6, the D-linear part of g1_6(C,xJ) is B6(xC,x^2J).  "
            "The D-linear part of the second isolate forward difference g2_6(J,C) "
            "is B6((I^2-2I+1)J,xC)=B6(x^2J,xC); symmetry gives equality.  The "
            "lower N5 payment has no D block."
        ),
        "expressions": {
            "Lambda_and_swapped_polarization": summary(lambda_expression),
            "unswapped_orientation_gap": summary(unswapped_gap),
        },
        "new_sufficient_lemma": (
            "For genuine ordinary-parent triples with J induced in H and "
            "C=(1+x)H+xK, prove g2_6(J,C)>=g2_6(J,0)."
        ),
        "frozen_G2_boundary": (
            "The completed G2 theorem requires its second marked forest to be an actual "
            "induced minor of the first.  Here J is induced in C but the swapped cell is "
            "oriented (J,C), so C is a superforest and the theorem does not apply."
        ),
        "dependencies_sha256": PINS,
        "scope_guard": (
            "This is an exact identity and target reduction only.  It proves no sign, no "
            "ordinary-parent leaf theorem, no universal rank-six g1 theorem, and no "
            "resolution of Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
        "status": "exact swapped-G2 reduction; superforest monotonicity remains open",
        "theorem": None,
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
