#!/usr/bin/env python3
"""Exact recursive-g2 residual split for an ordinary leaf in rank-six g1.

Let ell be an unmarked leaf with ordinary parent p.  After deleting ell write

    A = H + x K,             C = A + x H,

where H=A-p and K=A-N[p].  For an actual induced D, write J=B-p and, when
p is retained, B=J+xL.  This source proves exact algebraic identities for all
four parent/leaf retention cases.  It is a reduction only: signs of the new
coupled residuals F and T, and of the displayed C5 polarization, are not
asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    add_leaf,
    substitute,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_split_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "DERIVED_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_LEAF_RECURSIVE_G2_"
    "RESIDUAL_SPLIT_G1_NONADJACENT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def zero_rows():
    return tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")


def rename(expression, old: str, new: str):
    rules = {
        sp.Symbol(f"{old}{family}{rank}"): sp.Symbol(f"{new}{family}{rank}")
        for family in "EUVW" for rank in range(8)
    }
    return sp.expand(expression.xreplace(rules))


def substitute_rank5(expression, generic_c, generic_d, crows, drows):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    return sp.expand(expression.subs(rules))


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def defect_coefficient(rowset, a, b):
    e, u, v, w = rowset
    return sp.expand(
        at(e, b) * at(w, a - 2)
        + at(e, a) * at(w, b - 2)
        + at(u, b - 1) * at(v, a - 1)
        + at(u, a - 1) * at(v, b - 1)
    )


def c5(rowset):
    return sp.expand(
        defect_coefficient(rowset, 4, 4)
        - defect_coefficient(rowset, 3, 5)
    )


def add_rows(left, right):
    return tuple(
        tuple(sp.expand(a + b) for a, b in zip(left_row, right_row))
        for left_row, right_row in zip(left, right)
    )


def summary(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    ranks = [int(str(symbol)[-1]) for symbol in variables]
    return {
        "terms": len(polynomial.terms()),
        "maximum_row_rank": max(ranks, default=None),
        "negative_scalar_coefficients": sum(1 for value in polynomial.coeffs() if value < 0),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main():
    rank6_g1 = reconstruct(1)
    rank6_g2 = reconstruct(2)
    hrows, krows, jrows, lrows = (rows(prefix) for prefix in "HKJL")
    zeros = zero_rows()

    arows = add_leaf(hrows, krows)
    crows = add_leaf(arows, hrows)
    ijrows = isolate_multiply(jrows, 1)
    brows = add_leaf(jrows, lrows)
    drows = add_leaf(brows, jrows)

    base_parent_deleted = substitute(rank6_g1, arows, jrows)
    deltas = {
        "parent_deleted_leaf_deleted": sp.expand(
            substitute(rank6_g1, crows, jrows) - base_parent_deleted
        ),
        "parent_deleted_leaf_retained": sp.expand(
            substitute(rank6_g1, crows, ijrows) - base_parent_deleted
        ),
    }
    base_parent_retained = substitute(rank6_g1, arows, brows)
    deltas.update({
        "parent_retained_leaf_deleted": sp.expand(
            substitute(rank6_g1, crows, brows) - base_parent_retained
        ),
        "parent_retained_leaf_retained": sp.expand(
            substitute(rank6_g1, crows, drows) - base_parent_retained
        ),
    })

    recursive_g2 = substitute(rank6_g2, hrows, jrows)
    f_hk = sp.expand(deltas["parent_deleted_leaf_deleted"] - recursive_g2)
    q_hl = sp.expand(
        deltas["parent_retained_leaf_deleted"]
        - deltas["parent_deleted_leaf_deleted"]
    )
    q_hj = rename(q_hl, "L", "J")
    q_kj = rename(rename(q_hl, "H", "K"), "L", "J")

    # T(H,J) is the mixed rank-six polarization P6(H,xJ).
    xjrows = add_leaf(zeros, jrows)
    t_hj = sp.expand(
        substitute(rank6_g1, hrows, xjrows)
        - substitute(rank6_g1, hrows, zeros)
    )

    claimed = {
        "parent_deleted_leaf_deleted": sp.expand(recursive_g2 + f_hk),
        "parent_deleted_leaf_retained": sp.expand(
            recursive_g2 + f_hk + q_hj + q_kj + t_hj
        ),
        "parent_retained_leaf_deleted": sp.expand(recursive_g2 + f_hk + q_hl),
        "parent_retained_leaf_retained": sp.expand(
            recursive_g2 + f_hk + q_hl + q_hj + q_kj + t_hj
        ),
    }
    assert all(sp.expand(deltas[label] - claimed[label]) == 0 for label in deltas)
    mixed_retention_difference = sp.expand(
        deltas["parent_retained_leaf_retained"]
        - deltas["parent_retained_leaf_deleted"]
        - deltas["parent_deleted_leaf_retained"]
        + deltas["parent_deleted_leaf_deleted"]
    )
    assert mixed_retention_difference == 0

    # Q has a compact, exact rank-five description.  P5(X,Y) is the D-linear
    # part of rank-five g1, and C5pol is the symmetric C5 polarization.
    generic_c, generic_d, rank5_g1, _rank5_g2 = raw_coefficients()
    rank5_zero = tuple(tuple(sp.Integer(0) for _ in range(7)) for _ in "EUVW")
    p5_hl = sp.expand(
        substitute_rank5(rank5_g1, generic_c, generic_d, hrows, lrows)
        - substitute_rank5(rank5_g1, generic_c, generic_d, hrows, rank5_zero)
    )
    c5pol_hl = sp.expand(c5(add_rows(hrows, lrows)) - c5(hrows) - c5(lrows))
    assert sp.expand(q_hl - p5_hl - c5pol_hl) == 0

    highest = sp.Symbol("HE7")
    top_coefficients = {
        label: str(sp.factor(sp.diff(value, highest)))
        for label, value in deltas.items()
    }
    assert set(top_coefficients.values()) == {"-7*HW1"}
    assert sp.factor(sp.diff(recursive_g2, highest)) == -7 * sp.Symbol("HW1")
    assert all(highest not in value.free_symbols for value in (f_hk, q_hl, q_hj, q_kj, t_hj))

    components = {
        "rank6_g2_H_J": recursive_g2,
        "F_H_K": f_hk,
        "Q_H_L": q_hl,
        "Q_H_J": q_hj,
        "Q_K_J": q_kj,
        "T_H_J": t_hj,
    }
    report = {
        "marker": MARKER,
        "recurrences": {
            "A": "H+xK",
            "C": "A+xH=(1+x)H+xK",
            "parent_deleted": "B=J; D'=J or (1+x)J",
            "parent_retained": "B=J+xL; D'=B or B+xJ",
        },
        "four_exact_identities": {
            "parent_deleted_leaf_deleted": "Delta=g2_6(H,J)+F(H,K)",
            "parent_deleted_leaf_retained": (
                "Delta=g2_6(H,J)+F(H,K)+Q(H,J)+Q(K,J)+T(H,J)"
            ),
            "parent_retained_leaf_deleted": "Delta=g2_6(H,J)+F(H,K)+Q(H,L)",
            "parent_retained_leaf_retained": (
                "Delta=g2_6(H,J)+F(H,K)+Q(H,L)+Q(H,J)+Q(K,J)+T(H,J)"
            ),
        },
        "residual_definitions": {
            "F(H,K)": "g1_6(H+xK+xH,0)-g1_6(H+xK,0)-g2_6(H,0)",
            "Q(X,Y)": "P6(xX,xY)=P5(X,Y)+C5(X+Y)-C5(X)-C5(Y)",
            "T(H,J)": "P6(H,xJ)",
            "P_r": "D-linear polarization g1_r(C,D)-g1_r(C,0)",
        },
        "checks": {
            "all_four_symbolic_differences_zero": True,
            "mixed_retention_second_difference_zero": True,
            "Q_rank5_identity_zero": True,
            "only_recursive_g2_contains_row_rank_7": True,
            "delta_HE7_coefficient": top_coefficients,
        },
        "component_summaries": {label: summary(value) for label, value in components.items()},
        "status": (
            "exact recursive reduction only; conditional on universal rank-six g2, "
            "the remaining sign problem is F plus the displayed Q/T residuals"
        ),
        "scope_guard": (
            "No sign is asserted for F, T, the C5 polarization, any full leaf delta, "
            "universal rank-six g1, or Erdos Problem 993."
        ),
        "dependencies": {
            "rank6_reconstruction": {
                "file": "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py",
                "sha256": sha256(HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py"),
            },
            "rank5_g1": {
                "file": "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py",
                "sha256": sha256(HERE / "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"),
            },
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "identities": report["four_exact_identities"],
        "components": report["component_summaries"],
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
