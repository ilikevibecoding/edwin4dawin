#!/usr/bin/env python3
"""Exact coefficient targets for the ordinary-parent retention payment Lambda.

Lambda=P6((1+x)H+xK,xJ) is linear in the actual induced-minor rows J.
This source extracts its smallest marked W/A/B/Z coefficient table and
compares it with the rank-five g1 polarization.  It asserts no sign theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import add_leaf, substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_retention_polarization_targets_exact_agent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_LEAF_RETENTION_POLARIZATION_TARGETS_AGENT"
PINS = {
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "iso_n5_g1_all_five_modes_exact_root_20260830.json":
        "F0FBA92CD71F72DB8E6CA6A3BACCFA0DD501102177598DE80CEE2792E9D143A4",
    "iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json":
        "6AE97573C08CD55B71C46D630F2ABE1769039D4C4023E0B166D1FFA761C601C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def zero_rows(length=8):
    return tuple(tuple(sp.Integer(0) for _ in range(length)) for _ in "EUVW")


def sub_rank5(expression, generic_c, generic_d, crows, drows):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    return sp.expand(expression.subs(rules))


def category_substitution(jrows):
    categories = {
        family: tuple(sp.Symbol(f"J{family}{rank}", nonnegative=True) for rank in range(8))
        for family in "WABZ"
    }
    rules = {}
    for rank in range(8):
        w, a, b, z = (categories[family][rank] for family in "WABZ")
        rules.update({
            jrows[3][rank]: w,
            jrows[1][rank]: w + a,
            jrows[2][rank]: w + b,
            jrows[0][rank]: w + a + b + z,
        })
    return rules, categories


def summary(expression):
    polynomial = sp.Poly(expression, *sorted(expression.free_symbols, key=str))
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(value.is_negative is True for value in polynomial.coeffs()),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs(), default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    hrows, krows, jrows = (rows(prefix) for prefix in "HKJ")
    zeros = zero_rows()
    crows = add_leaf(add_leaf(hrows, krows), hrows)
    xjrows = add_leaf(zeros, jrows)

    rank6_g1 = reconstruct(1)
    lambda_raw = sp.expand(
        substitute(rank6_g1, crows, xjrows) - substitute(rank6_g1, crows, zeros)
    )

    generic_c, generic_d, rank5_g1, _rank5_g2 = raw_coefficients()
    c5rows = tuple(tuple(row[:7]) for row in crows)
    j5rows = tuple(tuple(row[:7]) for row in jrows)
    zero5 = zero_rows(7)
    rank5_polar = sp.expand(
        sub_rank5(rank5_g1, generic_c, generic_d, c5rows, j5rows)
        - sub_rank5(rank5_g1, generic_c, generic_d, c5rows, zero5)
    )
    rank5_gap = sp.expand(lambda_raw - rank5_polar)

    rank6_g2 = reconstruct(2)
    rank6_g2_polar = sp.expand(
        substitute(rank6_g2, crows, jrows) - substitute(rank6_g2, crows, zeros)
    )
    rank6_g2_gap = sp.expand(lambda_raw - rank6_g2_polar)
    rank6_g2_swapped_polar = sp.expand(
        substitute(rank6_g2, jrows, crows) - substitute(rank6_g2, jrows, zeros)
    )
    rank6_g2_swapped_gap = sp.expand(lambda_raw - rank6_g2_swapped_polar)
    assert rank6_g2_swapped_gap == 0

    category_rules, categories = category_substitution(jrows)
    active_raw = tuple(
        value for row in jrows for value in row if value in lambda_raw.free_symbols
    )
    raw_coefficient_table = {
        str(variable): str(sp.factor(sp.diff(lambda_raw, variable)))
        for variable in active_raw
    }
    lambda_occ = sp.expand(lambda_raw.subs(category_rules))
    active = tuple(
        categories[family][rank]
        for family in "WABZ" for rank in range(8)
        if categories[family][rank] in lambda_occ.free_symbols
    )
    assert sp.Poly(lambda_occ, *active).total_degree() == 1
    coefficients = {
        str(variable): str(sp.factor(sp.diff(lambda_occ, variable)))
        for variable in active
    }
    coefficient_summaries = {
        name: summary(sp.diff(lambda_occ, variable))
        for name, variable in ((str(value), value) for value in active)
    }
    negative_target_count = sum(
        row["negative_scalar_coefficients"] > 0 for row in coefficient_summaries.values()
    )

    report = {
        "marker": MARKER,
        "scope": "ordinary-parent leaf geometry C=(1+x)H+xK with genuine J induced in H",
        "identity": "Lambda=P6(C,xJ)=Q(H,J)+Q(K,J)+T(H,J)",
        "rank5_comparison": {
            "candidate": "rank-five g1 polarization g1_5(C,J)-g1_5(C,0)",
            "exact_equal": rank5_gap == 0,
            "gap_summary": summary(rank5_gap),
            "consequence": (
                "Frozen positivity of complete rank-five g1 cells does not directly sign Lambda; "
                "Lambda is not the rank-five polarization candidate."
            ),
        },
        "rank6_g2_comparison": {
            "candidate": "rank-six g2 polarization g2_6(C,J)-g2_6(C,0)",
            "exact_equal": rank6_g2_gap == 0,
            "gap_summary": summary(rank6_g2_gap),
            "consequence": (
                "Frozen positivity of complete rank-six g2 cells does not directly sign Lambda; "
                "Lambda is not the rank-six g2 polarization candidate, and positivity of a "
                "functional does not sign its D-linear part by subtraction."
            ),
        },
        "rank6_g2_swapped_identity": {
            "identity": "Lambda=P6(C,xJ)=g2_6(J,C)-g2_6(J,0)",
            "exact_difference_zero": True,
            "operator_derivation": [
                "Let I=1+x and let B6(X,Y) be the symmetric bilinear polarization of the quadratic N6 operator.",
                "The D-linear part of g1_6(C,xJ) is B6((I-1)C,x*(xJ))=B6(xC,x^2J).",
                "The D-linear part of Delta_I^2 Gamma_6(J,C) is B6((I^2-2I+1)J,xC)=B6(x^2J,xC).",
                "Symmetry of B6 gives B6(xC,x^2J)=B6(x^2J,xC). The lower N5 payment has no D block and cancels in the polarization."
            ],
            "frozen_g2_boundary": (
                "The frozen g2 theorem does not apply directly: C is a superforest row block, "
                "not an actual induced minor of J. A separate superforest-polarization payment "
                "would be required."
            ),
        },
        "frozen_theorem_boundary": {
            "rank5_g1": (
                "The frozen theorem signs complete g1 cells in five canonical deepest-support modes, "
                "not arbitrary D-linear polarizations."
            ),
            "rank6_g2": (
                "The frozen theorem signs complete canonical g2 cells, not a subtraction of two such "
                "cells or the distinct one-sided P6 polarization."
            ),
            "result": "Neither frozen positivity theorem directly implies Lambda>=0.",
        },
        "smallest_targets": {
            "active_raw_J_variables": [str(value) for value in active_raw],
            "raw_count": len(active_raw),
            "raw_coefficient_formulas": raw_coefficient_table,
            "active_J_occupation_variables": [str(value) for value in active],
            "count": len(active),
            "coefficient_formulas": coefficients,
            "coefficient_summaries": coefficient_summaries,
            "targets_with_negative_free_scalar_coefficients": negative_target_count,
            "required_statement": (
                "The dot product sum_F,r JF_r*Coeff_F_r(H,K) is nonnegative on genuine "
                "forest occupation rows; coefficientwise nonnegativity is not asserted."
            ),
            "genuine_category_semantics": {
                "JW_r": "i_r(J-{u,v})",
                "JA_r": "0, or i_(r-1) of the induced forest remaining after forcing v and excluding u",
                "JB_r": "0, or i_(r-1) of the induced forest remaining after forcing u and excluding v",
                "JZ_r": "0, or i_(r-2) of the induced forest remaining after forcing both nonadjacent marks",
            },
            "available_cross_rank_inequality": (
                "For every derived forest R of order m, (r+1)i_(r+1)(R)<=(m-r)i_r(R), "
                "by counting one-vertex extensions of independent r-sets."
            ),
        },
        "summaries": {
            "Lambda_raw": summary(lambda_raw),
            "Lambda_occupation": summary(lambda_occ),
            "rank5_polarization_candidate": summary(rank5_polar),
            "rank6_g2_polarization_candidate": summary(rank6_g2_polar),
        },
        "status": "exact coefficient reduction only; Lambda sign remains open",
        "scope_guard": (
            "No retention-polarization theorem, ordinary-parent leaf theorem, universal leaf lemma, "
            "universal rank-six g1 theorem, or Erdos Problem 993 is asserted."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "active_targets": len(active),
        "negative_free_targets": negative_target_count,
        "rank5_equal": rank5_gap == 0,
        "summaries": report["summaries"],
        "source_sha256": report["source_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
