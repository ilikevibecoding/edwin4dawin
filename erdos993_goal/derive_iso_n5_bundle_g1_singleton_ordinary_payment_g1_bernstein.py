#!/usr/bin/env python3
"""Derive the exact residual payment for rank-five singleton-ordinary g1.

Let C be the four independence rows of a marked forest G, let p be distinct
from the marks, D the rows of G-p, and Q the rows of G-N[p].  The vertex
recurrence is C=D+xQ.  Polarizing the rank-five bundle identity gives

    g1(C,D) = S(C) + R_ord(C,Q),
    S=M5+3*C5,
    R_ord=2*N4(C)-2[z^5w^5]B_N(x^2 Q,x C).

This source derives that identity directly from the raw 54-term Gamma_1 and
then substitutes exact forest inclusion-exclusion formulas through rank five.
It is an algebraic reduction only; the sign of R_ord is not asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_g1_deepest_configuration_agent import i2, i3, i4, i5
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    raw_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n5_bundle_g1_singleton_ordinary_payment_exact_"
    "g1_bernstein_20260830.json"
)
MARKER = "DERIVED_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_PAYMENT_G1_BERNSTEIN"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def raw_payment():
    crows, drows, g1, _ = raw_coefficients()
    qrows = tuple(tuple(sp.symbols(f"q{name}0:7")) for name in "EUVW")
    d_equals_c = {
        d: c
        for drow, crow in zip(drows, crows)
        for d, c in zip(drow, crow)
    }
    d_equals_c_minus_xq = {
        d: c - (qrow[rank - 1] if rank else 0)
        for drow, crow, qrow in zip(drows, crows, qrows)
        for rank, (d, c) in enumerate(zip(drow, crow))
    }
    no_parent = sp.expand(g1.subs(d_equals_c))
    ordinary = sp.expand(g1.subs(d_equals_c_minus_xq))
    correction = sp.expand(ordinary - no_parent)

    # N4 is the rank-four nested form on C, reconstructed from the same
    # primitive used by raw_coefficients (the lower-rank Gamma payment).
    from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import nested
    n4 = nested(crows, 4)
    payment = sp.expand(2 * n4 + correction)
    assert sp.expand(ordinary - (no_parent - 2 * n4) - payment) == 0
    assert sp.Poly(correction, *(symbol for row in qrows for symbol in row)).total_degree() == 1
    return crows, qrows, no_parent, n4, correction, payment


def forest_configuration(payment, crows, qrows):
    n, e, du, dv, adjacent = sp.symbols(
        "n edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
    )
    common = sp.symbols("C_common_neighbor", integer=True, nonnegative=True)
    re, ru, rv = sp.symbols(
        "C_connected3_E C_connected3_U C_connected3_V",
        integer=True,
        nonnegative=True,
    )
    q35, r4 = sp.symbols(
        "C_three_edge_five C_connected4_E", integer=True, nonnegative=True
    )
    xu, xv, wedges = sp.symbols(
        "C_neighbor_excess_u C_neighbor_excess_v C_wedges_E",
        integer=True,
        nonnegative=True,
    )
    m, qe, qzu, qzv = sp.symbols(
        "Q_order Q_edges Q_mark_u_survives Q_mark_v_survives",
        integer=True,
        nonnegative=True,
    )
    qdu, qdv, qadjacent = sp.symbols(
        "Q_degree_u Q_degree_v Q_adjacent", integer=True, nonnegative=True
    )
    qwedges, qxu, qxv, qre = sp.symbols(
        "Q_wedges_E Q_neighbor_excess_u Q_neighbor_excess_v Q_connected3_E",
        integer=True,
        nonnegative=True,
    )

    cue, cve = e - du, e - dv
    cwe = e - du - dv + adjacent
    cuw = wedges - du * (du - 1) / 2 - xu
    cvw = wedges - dv * (dv - 1) / 2 - xv
    cww = (
        wedges
        - du * (du - 1) / 2
        - dv * (dv - 1) / 2
        - xu
        - xv
        + adjacent * (du + dv - 2)
        + common
    )
    quw = qwedges - qdu * (qdu - 1) / 2 - qxu
    qvw = qwedges - qdv * (qdv - 1) / 2 - qxv

    c_sub = {
        **{crows[index][0]: 1 for index in range(4)},
        crows[0][1]: n,
        crows[1][1]: n - 1,
        crows[2][1]: n - 1,
        crows[3][1]: n - 2,
        crows[0][2]: i2(n, e),
        crows[1][2]: i2(n - 1, cue),
        crows[2][2]: i2(n - 1, cve),
        crows[3][2]: i2(n - 2, cwe),
        crows[0][3]: i3(n, e, wedges),
        crows[1][3]: i3(n - 1, cue, cuw),
        crows[2][3]: i3(n - 1, cve, cvw),
        crows[3][3]: i3(n - 2, cwe, cww),
        crows[0][4]: i4(n, e, wedges, re),
        crows[1][4]: i4(n - 1, cue, cuw, ru),
        crows[2][4]: i4(n - 1, cve, cvw, rv),
        crows[0][5]: i5(n, e, wedges, re, q35, r4),
    }
    q_sub = {
        **{qrows[index][0]: 1 for index in range(4)},
        qrows[0][1]: m,
        qrows[1][1]: m - qzu,
        qrows[2][1]: m - qzv,
        qrows[3][1]: m - qzu - qzv,
        qrows[0][2]: i2(m, qe),
        qrows[1][2]: i2(m - qzu, qe - qdu),
        qrows[2][2]: i2(m - qzv, qe - qdv),
        qrows[3][2]: i2(
            m - qzu - qzv, qe - qdu - qdv + qadjacent
        ),
        qrows[0][3]: i3(m, qe, qwedges),
        qrows[1][3]: i3(m - qzu, qe - qdu, quw),
        qrows[2][3]: i3(m - qzv, qe - qdv, qvw),
        qrows[0][4]: i4(m, qe, qwedges, qre),
    }

    expression = sp.expand(payment.subs(c_sub).subs(q_sub))
    # Reduce the graph-adjacency indicator modulo a^2=a.
    expression = sp.rem(
        sp.Poly(expression, adjacent),
        sp.Poly(adjacent**2 - adjacent, adjacent),
    ).as_expr()
    expression = sp.factor(expression)
    symbols = {
        "n": n, "edge_count": e, "degree_u": du, "degree_v": dv,
        "adjacent": adjacent, "C_common_neighbor": common,
        "C_connected3_E": re, "C_connected3_U": ru,
        "C_connected3_V": rv, "C_three_edge_five": q35,
        "C_connected4_E": r4, "C_neighbor_excess_u": xu,
        "C_neighbor_excess_v": xv, "C_wedges_E": wedges,
        "Q_order": m, "Q_edges": qe,
        "Q_mark_u_survives": qzu, "Q_mark_v_survives": qzv,
        "Q_degree_u": qdu, "Q_degree_v": qdv,
        "Q_adjacent": qadjacent, "Q_wedges_E": qwedges,
        "Q_neighbor_excess_u": qxu, "Q_neighbor_excess_v": qxv,
        "Q_connected3_E": qre,
    }
    return expression, symbols


def main():
    crows, qrows, no_parent, n4, correction, payment = raw_payment()
    invariant, symbols = forest_configuration(payment, crows, qrows)
    motif_names = (
        "C_connected3_E", "C_connected3_U", "C_connected3_V",
        "C_three_edge_five", "C_connected4_E", "Q_connected3_E",
    )
    motif_coefficients = {
        name: str(sp.factor(sp.diff(invariant, symbols[name])))
        for name in motif_names
    }
    variables = sorted(invariant.free_symbols, key=str)
    report = {
        "marker": MARKER,
        "identity": (
            "g1(singleton_ordinary)=S(C)+R_ord(C,Q), S=M5+3C5, "
            "R_ord=2N4(C)-2[z5w5]B_N(x^2Q,xC), Q=G-N[p]"
        ),
        "row_recurrence": "C=D+xQ with D=rows(G-p), Q=rows(G-N[p])",
        "raw_correction": str(sp.factor(correction)),
        "raw_payment": str(sp.factor(payment)),
        "raw_term_counts": {
            "correction": len(sp.Poly(
                correction, *(symbol for row in crows + qrows for symbol in row)
            ).terms()),
            "payment": len(sp.Poly(
                payment, *(symbol for row in crows + qrows for symbol in row)
            ).terms()),
        },
        "forest_invariant": str(invariant),
        "forest_invariant_term_count": len(sp.Poly(invariant, *variables).terms()),
        "high_motif_coefficients": motif_coefficients,
        "status": "exact algebraic reduction; payment sign not asserted",
        "scope": (
            "Singleton-ordinary rank-five g1 residual for a forest G and p,u,v "
            "distinct. This does not prove R_ord>=0, g1 in other modes, all N5, "
            "or Erdos Problem 993."
        ),
        "dependencies": {
            "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
                sha256(HERE / "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"),
            "derive_iso_n4_bundle_g1_deepest_configuration_agent.py":
                sha256(HERE / "derive_iso_n4_bundle_g1_deepest_configuration_agent.py"),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "raw_term_counts": report["raw_term_counts"],
        "forest_invariant_term_count": report["forest_invariant_term_count"],
        "high_motif_coefficients": motif_coefficients,
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
