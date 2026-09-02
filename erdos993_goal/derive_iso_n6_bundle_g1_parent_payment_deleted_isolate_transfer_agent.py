#!/usr/bin/env python3
"""Exact deleted-common-isolate transfer for the coupled parent payment.

For an unmarked isolated vertex z belonging to H and K but deleted from J and
L, all four H/K marked rows are multiplied by (1+x), while J/L are fixed.  The
script derives the exact increment R_epsilon and records why raw
coefficientwise positivity cannot prove its sign.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
)
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    add_leaf,
    substitute,
)
from derive_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_split_g1_nonadjacent import (
    rows,
    summary,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_parent_payment_deleted_isolate_transfer_exact_agent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_PARENT_PAYMENT_DELETED_ISOLATE_TRANSFER_AGENT"


def main():
    expressions = build_expressions()
    hrows, krows, jrows, lrows = (rows(prefix) for prefix in "HKJL")
    ihrows, ikrows = isolate_multiply(hrows, 1), isolate_multiply(krows, 1)
    shift = {
        **{
            sp.Symbol(f"H{family}{rank}"): ihrows[index][rank]
            for index, family in enumerate("EUVW") for rank in range(8)
        },
        **{
            sp.Symbol(f"K{family}{rank}"): ikrows[index][rank]
            for index, family in enumerate("EUVW") for rank in range(8)
        },
    }
    payments = {
        "epsilon0": sp.expand(expressions["g2"] + expressions["F"]),
        "epsilon1": sp.expand(expressions["g2"] + expressions["F"] + expressions["QHL"]),
    }
    increments = {label: sp.expand(value.xreplace(shift) - value) for label, value in payments.items()}

    # The isolate transfer commutes with the original ordinary-leaf increment.
    # Its mixed difference is exactly the rank-six g2 ordinary-leaf increment.
    rank6_g2 = reconstruct(2)
    arows = add_leaf(hrows, krows)
    crows = add_leaf(arows, hrows)
    brows = add_leaf(jrows, lrows)
    g2_leaf_increments = {
        "epsilon0": sp.expand(substitute(rank6_g2, crows, jrows) - substitute(rank6_g2, arows, jrows)),
        "epsilon1": sp.expand(substitute(rank6_g2, crows, brows) - substitute(rank6_g2, arows, brows)),
    }
    assert all(
        sp.expand(increments[label] - g2_leaf_increments[label]) == 0
        for label in increments
    )

    # Honor the universal constant coefficient 1 in every marked row, but no
    # other forest realizability constraints.  This exact relaxation corner
    # isolates the common -7 HE7*HW0 term.
    all_symbols = set().union(*(value.free_symbols for value in increments.values()))
    relaxation = {
        symbol: (sp.Integer(1) if str(symbol)[-1] == "0" else sp.Integer(0))
        for symbol in all_symbols
    }
    relaxation[sp.Symbol("HE7")] = sp.Integer(1)
    relaxation_values = {
        label: int(value.subs(relaxation)) for label, value in increments.items()
    }
    assert relaxation_values == {"epsilon0": -7, "epsilon1": -7}

    report = {
        "marker": MARKER,
        "exact_recurrence": {
            label: (
                f"S_{label[-1]}((1+x)H,J,(1+x)K,L)=S_{label[-1]}(H,J,K,L)+R_{label[-1]}(H,J,K,L)"
            )
            for label in increments
        },
        "exact_g2_leaf_identity": {
            "epsilon0": "R_0=g2_6(C,J)-g2_6(A,J)",
            "epsilon1": "R_1=g2_6(C,J+xL)-g2_6(A,J+xL)",
            "all_symbolic_differences_zero": True,
            "interpretation": (
                "Deleted-common-isolate telescoping for the parent payment is exactly the ordinary-parent "
                "leaf-monotonicity problem for rank-six g2, not a new independent extension inequality."
            ),
        },
        "increment_summaries": {label: summary(value) for label, value in increments.items()},
        "increment_polynomial_sha256": {
            label: hashlib.sha256(sp.srepr(value).encode()).hexdigest().upper()
            for label, value in increments.items()
        },
        "raw_coefficientwise_obstruction": {
            "assignment": "every rank-zero row entry is 1; HE7=1; every other positive-rank entry is 0",
            "values": relaxation_values,
            "meaning": (
                "The exact isolate increment is not coefficientwise nonnegative even after enforcing constant terms. "
                "Any proof of R_epsilon>=0 on forests must use forest realizability inequalities."
            ),
        },
        "known_genuine_obstructions": {
            "negative_Q": (
                "The order-55 Q=-113715696 witness already has K=H and L=J because the distinguished "
                "leaf-parent edge is a detached K2; therefore it fully respects the genuine K,L coupling."
            ),
            "negative_post_g2_residual": (
                "The order-10 R10=-143 witness was generated from an actual ordinary leaf and actual induced minor; "
                "therefore its K=A-N[p] and L=J intersect K are genuine, not independent-row artifacts."
            ),
        },
        "precise_existing_g2_leaf_residual_cone": {
            "sector_count": 256,
            "range": "order(C)>=8; leaf and parent unmarked",
            "containment_payments": 5888,
            "residual_scalar_coefficients": 30816,
            "negative_residual_scalar_coefficients": 16768,
            "minimum_residual_scalar_coefficient": -122,
            "ordered_residual_hash_stream_sha256": "C30A5E4C94AF3D556AB4A2FD11040E95CA528ADE672865A880EECB0DD3C7EBDD",
            "status": (
                "The exact categorywise containment/shifted-power cone is insufficient in every sector. "
                "Cross-rank forest extension and marked-row realizability payments are still required."
            ),
        },
        "status": (
            "exact reduction to rank-six g2 ordinary-leaf monotonicity; precise 256-sector residual cone remains open"
        ),
        "scope_guard": (
            "The -7 relaxation corner is not a forest counterexample. This report does not refute or prove the "
            "coupled payment lemma, universal leaf lemma, rank-six G1, or Problem 993."
        ),
        "dependency_sha256": {
            "coupled_reduction_report": "183EDA0B4E3030FC60C7960938ABD0B7341E7F10419A7D52220D4C41DD95C64B",
            "negative_Q_report": "C9ADC311C143B915D863DECBDC7F7E95392E76A6D353DDFCB43E9633AEA44242",
            "negative_post_g2_report": "7FF7EBA7BD9756AE9A35C62BBAE39A0D42EADAF48D467E4C9B58CD2B6A4DEB06",
            "g2_leaf_sector_cone_source": "82F2072AD7A41EF74E0263F505AC1272B0F1382150B39A2F24D0CFB7EE1749DC",
            "g2_leaf_sector_cone_report": "853053763505B05C1E658A7554E9456D4CF10AB81162733406351D716A8FBDAF",
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "increment_summaries": report["increment_summaries"],
        "relaxation_values": relaxation_values,
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
