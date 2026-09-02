#!/usr/bin/env python3
"""Exact occupation normal form for the canonical singleton-ordinary leaf delta.

The earlier canonical split writes the parent/leaf-retained ordinary-leaf
increment of ``g1_6(C,C-p)`` in H,K and the two parent losses P,Q.  This
producer makes the crucial quantitative-G2 alignment explicit:

    Delta11 = g2_6(H,H-P) + R(H,K;P,Q).

It then changes all H,K,P,Q rows to the four disjoint marked-occupation
categories W,A,B,Z.  The P-part of ``g2_6(H,H-P)`` is independently checked
against the coefficient table used by the ordinary-parent G2 envelope.  No
sign of the residual is asserted here.
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
from probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root import (
    coefficient_terms,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "DERIVED_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_COMPLETE_"
    "OCCUPATION_G1_NONADJACENT"
)

PINNED = {
    "canonical_split_source": (
        "derive_iso_n6_bundle_g1_singleton_ordinary_leaf_g2_parent_loss_split_g1_nonadjacent.py",
        "B21BA23B0EFE10F3E022B108188B0A2CBFF02B23BDB570B25F5A61188756B723",
    ),
    "canonical_split_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_g2_parent_loss_split_exact_g1_nonadjacent_20260831.json",
        "639A55EE6B67E7B6AEB135545F35A2D16942B9452F38DB58893F0A714A6CABAD",
    ),
    "ordinary_g2_loss_source": (
        "derive_iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_root.py",
        "EE834F16F2CE0793975DE507DAF7276F15C933C174EEE5B464732D692B74A00F",
    ),
    "ordinary_g2_loss_report": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json",
        "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def summary(expression: sp.Expr) -> dict[str, object]:
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "variables": len(variables),
        "negative_scalar_coefficients": sum(1 for value in coefficients if value < 0),
        "minimum_scalar_coefficient": str(min(coefficients, default=0)),
        "polynomial_sha256": hashlib.sha256(
            sp.srepr(expression).encode()
        ).hexdigest().upper(),
    }


def occupation(prefix: str, raw_rows):
    """Return raw-row -> disjoint W,A,B,Z occupation substitution.

    E=W+A+B+Z, U=W+A, V=W+B, W=W.  Thus A is the category
    surviving deletion of u but not v, and B is its u/v mirror.
    """
    categories = {
        family: tuple(
            sp.Symbol(f"{prefix}{family}{rank}", integer=True, nonnegative=True)
            for rank in range(8)
        )
        for family in "WABZ"
    }
    erow, urow, vrow, wrow = raw_rows
    rules = {}
    for rank in range(8):
        w, a, b, z = (categories[family][rank] for family in "WABZ")
        rules[wrow[rank]] = w
        rules[urow[rank]] = w + a
        rules[vrow[rank]] = w + b
        rules[erow[rank]] = w + a + b + z
    return rules, categories


def linear_coefficients(expression: sp.Expr, variables) -> dict[str, str]:
    return {
        str(variable): str(sp.factor(sp.diff(expression, variable)))
        for variable in variables
        if variable in expression.free_symbols
    }


def evaluate_terms(terms) -> sp.Expr:
    return sp.expand(sum(scalar * row[rank] for scalar, row, rank in terms))


def main() -> None:
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    components = build_expressions()
    hrows, krows, jrows, lrows = (symbolic_rows(prefix) for prefix in "HKJL")
    prows, qrows = (symbolic_rows(prefix) for prefix in "PQ")

    j_rules = {
        jvalue: hvalue - pvalue
        for jrow, hrow, prow in zip(jrows, hrows, prows)
        for jvalue, hvalue, pvalue in zip(jrow, hrow, prow)
    }
    l_rules = {
        lvalue: kvalue - qvalue
        for lrow, krow, qrow in zip(lrows, krows, qrows)
        for lvalue, kvalue, qvalue in zip(lrow, krow, qrow)
    }
    q_raw = tuple(value for row in qrows for value in row)

    ordinary_g2 = sp.expand(components["g2"].subs(j_rules))
    residual = sp.expand(
        components["F"] + components["QHL"] + components["QHJ"]
        + components["QKJ"] + components["T"]
    ).subs(j_rules | l_rules)
    residual = sp.expand(residual)
    full = sp.expand(ordinary_g2 + residual)
    residual_q0 = sp.expand(residual.subs({value: 0 for value in q_raw}))
    full_q0 = sp.expand(ordinary_g2 + residual_q0)

    occupation_rules = {}
    categories = {}
    for prefix, rows in (("H", hrows), ("K", krows), ("P", prows), ("Q", qrows)):
        rules, block = occupation(prefix, rows)
        occupation_rules.update(rules)
        categories[prefix] = block

    ordinary_g2_occ = sp.expand(ordinary_g2.subs(occupation_rules))
    residual_occ = sp.expand(residual.subs(occupation_rules))
    residual_q0_occ = sp.expand(residual_q0.subs(occupation_rules))
    full_occ = sp.expand(full.subs(occupation_rules))
    full_q0_occ = sp.expand(full_q0.subs(occupation_rules))

    p_variables = tuple(
        categories["P"][family][rank]
        for family in "WABZ" for rank in range(8)
    )
    q_variables = tuple(
        categories["Q"][family][rank]
        for family in "WABZ" for rank in range(8)
    )
    zero_p = {value: 0 for value in p_variables}
    g2_no_parent_occ = sp.expand(ordinary_g2_occ.subs(zero_p))
    g2_parent_correction_occ = sp.expand(ordinary_g2_occ - g2_no_parent_occ)
    active_p_g2 = tuple(
        value for value in p_variables if value in g2_parent_correction_occ.free_symbols
    )
    assert sp.Poly(g2_parent_correction_occ, *active_p_g2).total_degree() == 1

    # Translate the exact coefficient table used by the quantitative G2
    # source into same-rank occupation variables.  Its b,c,d rows have had
    # the marked vertices stripped, hence the +1,+1,+2 shifts below.
    hw = categories["H"]["W"]
    ha = categories["H"]["A"]
    hb = categories["H"]["B"]
    hz = categories["H"]["Z"]
    zero = sp.Integer(0)
    arow = hw
    brow = tuple(ha[rank + 1] if rank + 1 < 8 else zero for rank in range(8))
    crow = tuple(hb[rank + 1] if rank + 1 < 8 else zero for rank in range(8))
    drow = tuple(hz[rank + 2] if rank + 2 < 8 else zero for rank in range(8))
    expected_table = coefficient_terms(arow, brow, crow, drow)
    loss_lookup = {
        f"P{family}{rank}": categories["P"][family][rank]
        for family in "WABZ" for rank in range(8)
    }
    table_checks = {}
    for label, terms in expected_table.items():
        variable = loss_lookup[label]
        actual = sp.expand(sp.diff(g2_parent_correction_occ, variable))
        expected = evaluate_terms(terms)
        table_checks[label] = actual == expected
    assert all(table_checks.values())
    assert set(str(value) for value in active_p_g2) == set(expected_table)

    # The complete residual is linear in both loss blocks.  Keep the entire
    # coupled sum: this certificate does not attempt to sign either residual
    # or a loss correction in isolation.
    active_p_residual = tuple(value for value in p_variables if value in residual_occ.free_symbols)
    active_q_residual = tuple(value for value in q_variables if value in residual_occ.free_symbols)
    assert sp.Poly(residual_occ, *(active_p_residual + active_q_residual)).total_degree() == 1
    assert sp.expand(full_occ - ordinary_g2_occ - residual_occ) == 0
    assert sp.expand(full_q0_occ - ordinary_g2_occ - residual_q0_occ) == 0
    assert not (set(q_variables) & residual_q0_occ.free_symbols)

    report = {
        "marker": MARKER,
        "canonical_mode": "singleton_ordinary",
        "exact_complete_identities": {
            "p_in_K": "Delta11=g2_6(H,H-P)+R(H,K;P,Q)",
            "p_not_in_K": "Delta11=g2_6(H,H-P)+R(H,K;P,0)",
            "J": "H-P",
            "L_when_p_in_K": "K-Q",
            "L_when_p_not_in_K": "K",
        },
        "occupation_coordinates": {
            "rule": "XE=XW+XA+XB+XZ, XU=XW+XA, XV=XW+XB for X=H,K,P,Q",
            "rank_policy": "all W,A,B,Z subscripts are actual independent-set ranks",
            "g2_envelope_shift": "a_r=HW_r, b_r=HA_(r+1), c_r=HB_(r+1), d_r=HZ_(r+2)",
        },
        "ordinary_g2_alignment": {
            "active_parent_loss_variables": [str(value) for value in active_p_g2],
            "coefficient_table_checks": table_checks,
            "all_sixteen_checks_zero": all(table_checks.values()),
            "coefficient_table": linear_coefficients(
                g2_parent_correction_occ, active_p_g2
            ),
            "quantitative_source": (
                "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py"
            ),
        },
        "complete_residual": {
            "active_P_variables": [str(value) for value in active_p_residual],
            "active_Q_variables": [str(value) for value in active_q_residual],
            "P_coefficients": linear_coefficients(residual_occ, active_p_residual),
            "Q_coefficients": linear_coefficients(residual_occ, active_q_residual),
        },
        "summaries": {
            "ordinary_g2_H_H_minus_P": summary(ordinary_g2_occ),
            "ordinary_g2_no_parent": summary(g2_no_parent_occ),
            "ordinary_g2_parent_correction": summary(g2_parent_correction_occ),
            "complete_residual_p_in_K": summary(residual_occ),
            "complete_residual_p_not_in_K": summary(residual_q0_occ),
            "complete_delta_p_in_K": summary(full_occ),
            "complete_delta_p_not_in_K": summary(full_q0_occ),
        },
        "checks": {
            "complete_p_in_K_identity_zero": True,
            "complete_p_not_in_K_identity_zero": True,
            "residual_linear_in_P_Q": True,
            "p_not_in_K_has_no_Q": True,
            "ordinary_g2_coefficient_table_bytewise_symbolic_match": True,
        },
        "status": (
            "exact fail-closed reduction only; the sign of the complete residual-coupled "
            "G2 lower sum remains open"
        ),
        "scope_guard": (
            "This does not prove leaf monotonicity, canonical singleton-ordinary g1, "
            "all-five-mode rank-six g1, N6, or Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "ordinary_g2_alignment": report["ordinary_g2_alignment"],
        "summaries": report["summaries"],
        "checks": report["checks"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
