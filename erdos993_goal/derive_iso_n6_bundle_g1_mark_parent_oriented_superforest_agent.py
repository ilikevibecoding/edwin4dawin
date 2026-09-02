#!/usr/bin/env python3
"""Exact marked-parent G1 leaf increments and swapped-G2 retention split."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_mark_parent_oriented_superforest_exact_agent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_MARK_PARENT_ORIENTED_SUPERFOREST_AGENT"
PINS = {
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def zero_rows():
    return tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")


def add_mark_leaf(rowset, endpoint: str):
    e, u, v, w = rowset
    sources = (u, u, w, w) if endpoint == "u" else (v, w, v, w)
    return tuple(tuple(
        sp.expand(row[rank] + (source[rank - 1] if rank else 0))
        for rank in range(8)
    ) for row, source in zip(rowset, sources))


def delete_mark_rows(rowset, endpoint: str):
    e, u, v, w = rowset
    return (u, u, w, w) if endpoint == "u" else (v, w, v, w)


def ordinary_add_leaf(left, deleted):
    return tuple(tuple(
        sp.expand(row[rank] + (source[rank - 1] if rank else 0))
        for rank in range(8)
    ) for row, source in zip(left, deleted))


def summary(expression: sp.Expr) -> dict[str, object]:
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(1 for value in coefficients if value < 0),
        "minimum_scalar_coefficient": str(min(coefficients, default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(sp.expand(expression)).encode()).hexdigest().upper(),
    }


def exact_span(target: sp.Expr, candidates: list[sp.Expr]) -> tuple[str, tuple[int, int]]:
    variables = tuple(sorted(target.free_symbols, key=str))
    target_terms = dict(sp.Poly(target, *variables).terms())
    candidate_terms = [dict(sp.Poly(sp.expand(value), *variables).terms()) for value in candidates]
    monomials = sorted(set(target_terms).union(*(set(row) for row in candidate_terms)))
    matrix = sp.Matrix([[row.get(monomial, 0) for row in candidate_terms] for monomial in monomials])
    rhs = sp.Matrix([target_terms.get(monomial, 0) for monomial in monomials])
    return str(sp.linsolve((matrix, rhs))), matrix.shape


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINS}
    if actual != PINS:
        raise RuntimeError(("dependency hash mismatch", actual, PINS))

    arows, brows, krows, zero = rows("A"), rows("B"), rows("K"), zero_rows()
    g1, g2 = reconstruct(1), reconstruct(2)
    base = sp.expand(substitute(g1, arows, brows))
    cases = {}
    for endpoint in ("u", "v"):
        srows = delete_mark_rows(arows, endpoint)
        trows = delete_mark_rows(brows, endpoint)
        crows = add_mark_leaf(arows, endpoint)
        drows = add_mark_leaf(brows, endpoint)
        omega = sp.expand(substitute(g1, crows, brows) - base)
        retained = sp.expand(substitute(g1, crows, drows) - base)
        response = sp.expand(retained - omega)
        swapped = sp.expand(substitute(g2, trows, crows) - substitute(g2, trows, zero))
        if sp.expand(response - swapped) != 0:
            raise RuntimeError(("swapped retention identity failed", endpoint))
        cases[endpoint] = {
            "S": srows, "T": trows, "C": crows,
            "omega": omega, "retained": retained,
            "response": response, "swapped": swapped,
        }

    swap = {}
    for rowset in (arows, brows):
        for rank in range(8):
            swap[rowset[1][rank]], swap[rowset[2][rank]] = rowset[2][rank], rowset[1][rank]
    for label in ("omega", "retained", "response"):
        if sp.expand(cases["u"][label].xreplace(swap) - cases["v"][label]) != 0:
            raise RuntimeError(("u/v swap failed", label))

    # Both (A,B) and (A-u,B-u) are natural actual-minor pairs.  Test the
    # entire already-frozen coefficient family on both pairs.
    frozen_candidates = []
    frozen_labels = []
    for index in range(2, 11):
        coefficient = reconstruct(index)
        frozen_candidates.extend((
            sp.expand(substitute(coefficient, arows, brows)),
            sp.expand(substitute(coefficient, cases["u"]["S"], cases["u"]["T"])),
        ))
        frozen_labels.extend((f"G{index}(A,B)", f"G{index}(A-u,B-u)"))
    span, shape = exact_span(cases["u"]["omega"], frozen_candidates)
    if span != "EmptySet":
        raise RuntimeError(("unexpected frozen-cell span", span))

    # A marked support is not a boundary specialization of the ordinary-parent
    # recurrence A=H+xK in all four rows.  With H=A-u, its U row is exactly
    # A-u again, so the attempted ordinary recurrence already misses by -K_U0
    # at rank one (equal to -1 for an actual forest row).
    ordinary_candidate = ordinary_add_leaf(cases["u"]["S"], krows)
    ordinary_u_rank1_mismatch = sp.expand(arows[1][1] - ordinary_candidate[1][1])
    if ordinary_u_rank1_mismatch != -krows[1][0]:
        raise RuntimeError(("ordinary-parent obstruction failed", ordinary_u_rank1_mismatch))

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "scope": (
            "Every marked forest A, every actual induced marked minor B, and an unmarked "
            "leaf whose parent is distinguished mark u or v. Both adjacent and nonadjacent "
            "mark geometries satisfy the same row identities."
        ),
        "definitions": {
            "S": "A-u", "T": "B-u", "C": "A+xS",
            "Omega_u": "G1_6(A+xS,B)-G1_6(A,B)",
        },
        "deleted_state": {
            "identity": "Delta_u,deleted=Omega_u(A,B)",
            "new_oriented_base_lemma": "Omega_u(A,B)>=0",
            "u_v_unification": "Omega_v is the exact mark swap of Omega_u",
            "summary": summary(cases["u"]["omega"]),
        },
        "retained_state": {
            "identity": (
                "Delta_u,retained=Omega_u(A,B)+"
                "G2_6(B-u,A+x(A-u))-G2_6(B-u,0)"
            ),
            "polarization": "retention response=P6(A+x(A-u),x(B-u))",
            "shared_target": (
                "The second summand is exactly ordinary-parent Lambda's swapped-superforest "
                "target with C=A+x(A-u), J=B-u."
            ),
            "summary_response": summary(cases["u"]["response"]),
            "summary_full": summary(cases["u"]["retained"]),
        },
        "lemma_count": {
            "single_new_oriented_lemma_covers": ["u/v symmetry", "leaf deleted from D"],
            "retained_state_also_requires": "the already-open shared swapped-superforest lemma",
            "single_new_lemma_covers_all_four_states": False,
            "reason": (
                "The retained-minus-deleted response is the independent swapped polarization; "
                "Omega alone does not sign it."
            ),
        },
        "ordinary_parent_specialization_obstruction": {
            "attempted_recurrence": "A=(A-u)+x(A-N[u]) in every E,U,V,W row",
            "actual_marked_U_row": "A_U=(A-u)_U with no xK_U contribution",
            "exact_U_rank1_mismatch": str(ordinary_u_rank1_mismatch),
            "actual_forest_value": "-1 because K_U,0=1",
            "conclusion": (
                "The ordinary-parent deleted-leaf square does not specialize to mark parent. "
                "Omega_u is a genuinely endpoint-oriented base target."
            ),
        },
        "exact_obstruction": {
            "candidate_cells": frozen_labels,
            "linear_span": span,
            "coefficient_matrix_shape": list(shape),
            "conclusion": (
                "Omega_u is outside the scalar linear span of every frozen G2,...,G10 cell "
                "on both natural actual-minor pairs (A,B) and (A-u,B-u)."
            ),
        },
        "checks": {
            "retention_response_swapped_G2": True,
            "u_v_mark_swap": True,
            "frozen_two_pair_span_empty": True,
            "ordinary_parent_rank1_specialization_obstructed": True,
        },
        "status": "exact two-target reduction; signs remain open",
        "scope_guard": (
            "This proves identities and a linear-span obstruction only. It does not prove "
            "Omega>=0, swapped-superforest monotonicity, either marked-parent retained sign, "
            "universal rank-six G1, or Problem 993."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "checks": report["checks"],
        "span": span,
        "status": report["status"],
        "scope_guard": report["scope_guard"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
