#!/usr/bin/env python3
"""Exact deepest-ordinary forest configuration form for bundle g1.

Here G=H-s is a forest on n vertices, the deepest support has unique parent
p distinct from the two marks, and D=G-p.  The derivation starts directly
from Gamma_1 and substitutes exact inclusion-exclusion formulas through i5.
It is a reduction, not a positivity theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    add_xd,
    c2,
    c3,
    c4,
    convolve_isolates,
    i2,
    i3,
    i4,
    nested,
)


OUTPUT = Path("iso_n4_bundle_g1_deepest_configuration_exact_agent_20260829.json")


def c5(x):
    x = sp.sympify(x)
    return sp.expand(
        x * (x - 1) * (x - 2) * (x - 3) * (x - 4) / sp.Integer(120)
    )


def i5(order, edges, wedges, connected3, three_edge_five, connected4):
    """Independent 5-sets in a forest by edge-set inclusion-exclusion."""
    return sp.expand(
        c5(order)
        - edges * c3(order - 2)
        + c2(edges) * (order - 4)
        + wedges * c2(order - 4)
        - connected3 * (order - 4)
        - three_edge_five
        + connected4
    )


def raw_g1():
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in "EUVW")
    t0 = add_xd(crows, drows)
    t1 = add_xd(convolve_isolates(crows, 1, 5), drows)
    return sp.expand(nested(t1, 4) - nested(t0, 4) - nested(crows, 3))


def main():
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
    de, ddu, ddv = sp.symbols(
        "D_edges D_degree_u D_degree_v", integer=True, nonnegative=True
    )
    dxu, dxv, d_wedges, dre = sp.symbols(
        "D_neighbor_excess_u D_neighbor_excess_v D_wedges_E D_connected3_E",
        integer=True,
        nonnegative=True,
    )

    cue, cve = e - du, e - dv
    cwe = e - du - dv + adjacent
    cuw = wedges - c2(du) - xu
    cvw = wedges - c2(dv) - xv
    cww = (
        wedges
        - c2(du)
        - c2(dv)
        - xu
        - xv
        + adjacent * (du + dv - 2)
        + common
    )
    duw = d_wedges - c2(ddu) - dxu
    dvw = d_wedges - c2(ddv) - dxv
    q = n - 1
    substitution = {
        **{sp.symbols(f"c{name}0"): 1 for name in "EUVW"},
        **{sp.symbols(f"d{name}0"): 1 for name in "EUVW"},
        sp.symbols("cE1"): n,
        sp.symbols("cU1"): n - 1,
        sp.symbols("cV1"): n - 1,
        sp.symbols("cW1"): n - 2,
        sp.symbols("dE1"): q,
        sp.symbols("dU1"): q - 1,
        sp.symbols("dV1"): q - 1,
        sp.symbols("dW1"): q - 2,
        sp.symbols("cE2"): i2(n, e),
        sp.symbols("cU2"): i2(n - 1, cue),
        sp.symbols("cV2"): i2(n - 1, cve),
        sp.symbols("cW2"): i2(n - 2, cwe),
        sp.symbols("cE3"): i3(n, e, wedges),
        sp.symbols("cU3"): i3(n - 1, cue, cuw),
        sp.symbols("cV3"): i3(n - 1, cve, cvw),
        sp.symbols("cW3"): i3(n - 2, cwe, cww),
        sp.symbols("cE4"): i4(n, e, wedges, re),
        sp.symbols("cU4"): i4(n - 1, cue, cuw, ru),
        sp.symbols("cV4"): i4(n - 1, cve, cvw, rv),
        sp.symbols("cE5"): i5(n, e, wedges, re, q35, r4),
        sp.symbols("dE2"): i2(q, de),
        sp.symbols("dU2"): i2(q - 1, de - ddu),
        sp.symbols("dV2"): i2(q - 1, de - ddv),
        sp.symbols("dW2"): i2(q - 2, de - ddu - ddv + adjacent),
        sp.symbols("dE3"): i3(q, de, d_wedges),
        sp.symbols("dU3"): i3(q - 1, de - ddu, duw),
        sp.symbols("dV3"): i3(q - 1, de - ddv, dvw),
        sp.symbols("dE4"): i4(q, de, d_wedges, dre),
    }
    expression = sp.factor(raw_g1().subs(substitution))
    poly = sp.Poly(expression, *sorted(expression.free_symbols, key=str))

    motif_part = sp.expand(
        sum(
            sp.diff(expression, symbol) * symbol
            for symbol in (re, ru, rv, q35, r4, dre)
        )
    )
    residual = sp.factor(expression - motif_part)
    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_CONFIGURATION_REDUCTION_AGENT",
        "raw_identity": "g1=Gamma_1=N4(T1)-N4(T0)-N3(C)",
        "form": str(expression),
        "term_count": len(poly.terms()),
        "negative_scalar_coefficient_count": sum(
            1 for _, coefficient in poly.terms() if coefficient < 0
        ),
        "motif_part": str(sp.factor(motif_part)),
        "residual_without_high_motifs": str(residual),
        "i5_formula": (
            "C(n,5)-e*C(n-2,3)+C(e,2)(n-4)+W*C(n-4,2)"
            "-R3(n-4)-Q35+R4"
        ),
        "scope": (
            "Exact configuration reduction for the singleton deepest parent "
            "distinct from both marks. No sign theorem is asserted."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
