#!/usr/bin/env python3
"""Independent exact audit of the ordinary-parent coupled leaf reduction.

This reconstructs rank-six g1 directly and checks the polarization identity
behind the reduction of four retention cases to two sign obligations.  It is
an algebraic audit only and deliberately proves no sign.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    add_leaf,
    substitute,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_coupled_master_reduction_audit_exact_root_20260831.json"
MARKER = "AUDIT_EXACT_ISO_N6_BUNDLE_G1_LEAF_COUPLED_MASTER_REDUCTION_ROOT"
PINS = {
    "audit_iso_n6_bundle_g6_g2_transfer_audit.py":
        "A7C471704255D1705B5908D8940AF8DE0E9CB99EE74F9ED06E850A5F91C0783C",
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "derive_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_split_g1_nonadjacent.py":
        "9FB0F8A1EA68CC3CE419DB6A610F3F5A70FABE1F3C966DE06CBF6C03A35D14DD",
    "assemble_iso_n6_bundle_g1_leaf_coupled_master_reduction_agent.py":
        "103613CBD9B89B9EBE90062DAE14E4E9A6EB6251CA804D3527D5426F4D8DCEA7",
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


def row_difference(left, right):
    return tuple(
        tuple(sp.expand(a - b) for a, b in zip(left_row, right_row))
        for left_row, right_row in zip(left, right)
    )


def expression_record(expression):
    expression = sp.expand(expression)
    symbols = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *symbols)
    return {
        "terms": len(polynomial.terms()),
        "sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main() -> None:
    for name, expected in PINS.items():
        actual = sha256(HERE / name)
        require(actual == expected, f"dependency hash mismatch for {name}: {actual}")

    g1 = reconstruct(1)
    hrows, krows, jrows, lrows = (rows(prefix) for prefix in "HKJL")
    zrows = zeros()

    # A=H+xK and C=A+xH=(1+x)H+xK.
    arows = add_leaf(hrows, krows)
    crows = add_leaf(arows, hrows)
    xhrows = add_leaf(zrows, hrows)
    xkrows = add_leaf(zrows, krows)
    xjrows = add_leaf(zrows, jrows)

    def p6(carg, darg):
        return sp.expand(substitute(g1, carg, darg) - substitute(g1, carg, zrows))

    t_hj = p6(hrows, xjrows)
    q_hj = p6(xhrows, xjrows)
    q_kj = p6(xkrows, xjrows)
    lambda_sum = sp.expand(t_hj + q_hj + q_kj)
    lambda_direct = p6(crows, xjrows)
    require(sp.expand(lambda_direct - lambda_sum) == 0,
            "P6(C,xJ) polarization identity failed")

    # Check the identity again from all four direct g1 retention increments.
    d_parent_deleted_leaf_retained = isolate_multiply(jrows, 1)
    require(
        all(value == 0 for row in row_difference(
            row_difference(d_parent_deleted_leaf_retained, jrows), xjrows
        ) for value in row),
        "isolated-leaf row increment is not xJ",
    )
    brows = add_leaf(jrows, lrows)
    d_parent_retained_leaf_retained = add_leaf(brows, jrows)
    require(
        all(value == 0 for row in row_difference(
            row_difference(d_parent_retained_leaf_retained, brows), xjrows
        ) for value in row),
        "retained-parent leaf row increment is not xJ",
    )

    base_deleted = substitute(g1, arows, jrows)
    delta00 = sp.expand(substitute(g1, crows, jrows) - base_deleted)
    delta01 = sp.expand(
        substitute(g1, crows, d_parent_deleted_leaf_retained) - base_deleted
    )
    base_retained = substitute(g1, arows, brows)
    delta10 = sp.expand(substitute(g1, crows, brows) - base_retained)
    delta11 = sp.expand(
        substitute(g1, crows, d_parent_retained_leaf_retained) - base_retained
    )
    require(sp.expand(delta01 - delta00 - lambda_direct) == 0,
            "deleted-parent retention difference failed")
    require(sp.expand(delta11 - delta10 - lambda_direct) == 0,
            "retained-parent retention difference failed")
    require(sp.expand(delta11 - delta10 - delta01 + delta00) == 0,
            "mixed retention square failed")

    report = {
        "marker": MARKER,
        "status": "exact algebraic audit; two sign lemmas remain open",
        "identities": {
            "polarization": "P6(C,xJ)=T(H,J)+Q(H,J)+Q(K,J)",
            "C": "(1+x)H+xK",
            "retention_differences": [
                "Delta01-Delta00=P6(C,xJ)",
                "Delta11-Delta10=P6(C,xJ)",
                "Delta11-Delta10-Delta01+Delta00=0",
            ],
        },
        "expression_records": {
            "Lambda": expression_record(lambda_direct),
            "Delta00": expression_record(delta00),
            "Delta01": expression_record(delta01),
            "Delta10": expression_record(delta10),
            "Delta11": expression_record(delta11),
        },
        "dependencies_sha256": PINS,
        "scope_guard": (
            "This verifies only the ordinary-parent algebraic reduction.  It does not "
            "prove either remaining sign lemma, universal rank-six g1, all N6, rank "
            "seven, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
        "theorem": None,
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
