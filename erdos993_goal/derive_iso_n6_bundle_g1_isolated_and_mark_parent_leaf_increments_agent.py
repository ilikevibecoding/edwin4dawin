#!/usr/bin/env python3
"""Exact remaining-mode leaf increments for rank-six bundle G1.

This derives the isolated-unmarked and mark-parent recurrences from the raw
G1 functional.  It records one exact G2 reduction and the residual identities
that remain new sign obligations.  No sign theorem is asserted.
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
OUTPUT = HERE / "iso_n6_bundle_g1_isolated_and_mark_parent_leaf_increments_exact_agent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_ISOLATED_AND_MARK_PARENT_LEAF_INCREMENTS_AGENT"
PINS = {
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "audit_iso_n6_bundle_g6_g2_transfer_audit.py":
        "A7C471704255D1705B5908D8940AF8DE0E9CB99EE74F9ED06E850A5F91C0783C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def free_rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def zero_rows():
    return tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")


def add_mark_leaf(rows, endpoint: str):
    e, u, v, w = rows
    if endpoint == "u":
        sources = (u, u, w, w)
    elif endpoint == "v":
        sources = (v, w, v, w)
    else:
        raise ValueError(endpoint)
    return tuple(tuple(
        sp.expand(row[rank] + (source[rank - 1] if rank else 0))
        for rank in range(8)
    ) for row, source in zip(rows, sources))


def summary(expression: sp.Expr, normalize_rows=()) -> dict[str, object]:
    normalized = sp.expand(expression.subs({row[0]: 1 for rows in normalize_rows for row in rows}))
    variables = tuple(sorted(normalized.free_symbols, key=str))
    polynomial = sp.Poly(normalized, *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(1 for value in coefficients if value < 0),
        "minimum_scalar_coefficient": str(min(coefficients, default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(normalized).encode()).hexdigest().upper(),
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINS}
    if actual != PINS:
        raise RuntimeError(("dependency hash mismatch", actual, PINS))

    g1 = reconstruct(1)
    g2 = reconstruct(2)
    arows, brows = free_rows("A"), free_rows("B")
    base = substitute(g1, arows, brows)

    iarows = isolate_multiply(arows, 1)
    ibrows = isolate_multiply(brows, 1)
    isolate_deleted = sp.expand(substitute(g1, iarows, brows) - base)
    isolate_retained = sp.expand(substitute(g1, iarows, ibrows) - base)
    frozen_g2 = sp.expand(substitute(g2, arows, brows))
    isolate_deleted_residual = sp.expand(isolate_deleted - frozen_g2)
    isolate_retained_residual = sp.expand(isolate_retained - frozen_g2)
    if isolate_deleted_residual != 0 or isolate_retained_residual == 0:
        raise RuntimeError("isolated-mode reduction check failed")

    mark_cases = {}
    for endpoint in ("u", "v"):
        crows = add_mark_leaf(arows, endpoint)
        drows = add_mark_leaf(brows, endpoint)
        deleted = sp.expand(substitute(g1, crows, brows) - base)
        retained = sp.expand(substitute(g1, crows, drows) - base)
        retention_response = sp.expand(substitute(g1, crows, drows) - substitute(g1, crows, brows))
        if sp.expand(retained - deleted - retention_response) != 0:
            raise RuntimeError(("retention split failed", endpoint))
        mark_cases[endpoint] = {
            "deleted": deleted,
            "retained": retained,
            "retention_response": retention_response,
        }

    # Exact u/v exchange on both C and D rows.
    swap = {}
    for rows in (arows, brows):
        for rank in range(8):
            swap[rows[1][rank]], swap[rows[2][rank]] = rows[2][rank], rows[1][rank]
    for label in ("deleted", "retained", "retention_response"):
        if sp.expand(mark_cases["u"][label].xreplace(swap) - mark_cases["v"][label]) != 0:
            raise RuntimeError(("mark-swap check failed", label))

    # Natural frozen-G2 candidates do not equal the oriented mark-parent delta.
    su = (arows[1], arows[1], arows[3], arows[3])
    natural_g2 = {
        "G2(A,B)": frozen_g2,
        "G2(A-u,B)": sp.expand(substitute(g2, su, brows)),
    }
    natural_g2_residuals = {
        label: sp.expand(mark_cases["u"]["deleted"] - candidate)
        for label, candidate in natural_g2.items()
    }
    if any(residual == 0 for residual in natural_g2_residuals.values()):
        raise RuntimeError("unexpected mark-parent G2 collapse")

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "geometry": (
            "The row recurrences hold for adjacent and nonadjacent marks. Adjacent marks "
            "are the usual both-marks occupation face; no separate formula is needed."
        ),
        "isolated_unmarked_vertex": {
            "recurrence_C": "C'=(1+x)A in all E,U,V,W rows",
            "recurrence_D_deleted": "D'=B",
            "recurrence_D_retained": "D'=(1+x)B",
            "deleted_identity": "Delta_deleted=G2_6(A,B)",
            "deleted_reduces_to_frozen_G2": True,
            "retained_identity": "Delta_retained=G2_6(A,B)+R_iso(A,B)",
            "retained_residual_zero": False,
            "retained_requires_new_coupled_sign_lemma": True,
            "summaries": {
                "deleted": summary(isolate_deleted, (arows, brows)),
                "retained": summary(isolate_retained, (arows, brows)),
                "retained_post_G2_residual": summary(isolate_retained_residual, (arows, brows)),
            },
        },
        "mark_parent_leaf": {
            "u_recurrence_C": "E'=E+xU, U'=(1+x)U, V'=V+xW, W'=(1+x)W",
            "u_recurrence_D": "the same recurrence when the leaf is retained in D",
            "v_case": "exact u/v mark swap",
            "deleted_from_D": (
                "Delta_u,deleted=G1_6(A+x(A-u),B)-G1_6(A,B); this is an oriented "
                "polarization and is not G2_6(A,B) or G2_6(A-u,B)."
            ),
            "retained_in_D": (
                "Delta_u,retained=Delta_u,deleted+"
                "[G1_6(A+x(A-u),B+x(B-u))-G1_6(A+x(A-u),B)]."
            ),
            "requires_new_oriented_sign_lemmas": ["leaf_deleted_from_D", "leaf_retained_in_D"],
            "natural_G2_residuals_nonzero": {
                label: summary(residual, (arows, brows))
                for label, residual in natural_g2_residuals.items()
            },
            "summaries_u": {
                label: summary(expression, (arows, brows))
                for label, expression in mark_cases["u"].items()
            },
        },
        "checks": {
            "isolated_deleted_equals_frozen_G2": True,
            "isolated_retained_post_G2_residual_nonzero": True,
            "mark_parent_retention_split": True,
            "mark_parent_u_v_swap": True,
            "natural_mark_parent_G2_candidates_nonidentical": True,
        },
        "status": "exact identities only; new residual signs remain open",
        "scope_guard": (
            "This artifact proves the isolated-deleted reduction to frozen G2 and exact "
            "recurrences only. It does not prove the retained-isolate residual, either "
            "mark-parent sign, universal leaf monotonicity, all rank-six G1, or Problem 993."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "checks": report["checks"],
        "status": report["status"],
        "scope_guard": report["scope_guard"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
