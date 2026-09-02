#!/usr/bin/env python3
"""Independent i5 and root/agent configuration equivalence audit for bundle g1.

This audit closes a narrow provenance gap in the deepest-ordinary theorem:
the root configuration records the three-edge/five-vertex term via stars,
whereas the parallel configuration records it as Q35.  The two exact forms
must agree under Q35 = S(e-2)-2R3-H.

The script also reconstructs Gamma_1 directly from the nested functional and
substitutes independently written forest inclusion-exclusion formulas through
i5.  It does not prove positivity by itself.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
ROOT_REPORT = HERE / "iso_n4_bundle_g1_configuration_root_20260829.json"
AGENT_REPORT = HERE / "iso_n4_bundle_g1_deepest_configuration_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_i5_root_configuration_equivalence_audit_agent_20260829.json"


def choose(x: sp.Expr, k: int) -> sp.Expr:
    result = sp.Integer(1)
    for j in range(k):
        result *= x - j
    return sp.expand(result / sp.factorial(k))


def i2(n: sp.Expr, e: sp.Expr) -> sp.Expr:
    return sp.expand(choose(n, 2) - e)


def i3(n: sp.Expr, e: sp.Expr, wedges: sp.Expr) -> sp.Expr:
    return sp.expand(choose(n, 3) - e * (n - 2) + wedges)


def i4(n: sp.Expr, e: sp.Expr, wedges: sp.Expr, connected3: sp.Expr) -> sp.Expr:
    return sp.expand(
        choose(n, 4)
        - e * choose(n - 2, 2)
        + choose(e, 2)
        + wedges * (n - 4)
        - connected3
    )


def i5_q35(
    n: sp.Expr,
    e: sp.Expr,
    wedges: sp.Expr,
    connected3: sp.Expr,
    q35: sp.Expr,
    connected4: sp.Expr,
) -> sp.Expr:
    return sp.expand(
        choose(n, 5)
        - e * choose(n - 2, 3)
        + choose(e, 2) * (n - 4)
        + wedges * choose(n - 4, 2)
        - connected3 * (n - 4)
        - q35
        + connected4
    )


def at(row: tuple[sp.Expr, ...], rank: int) -> sp.Expr:
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def nested(rows: tuple[tuple[sp.Expr, ...], ...], rank: int) -> sp.Expr:
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def add_xd(
    crows: tuple[tuple[sp.Expr, ...], ...],
    drows: tuple[tuple[sp.Expr, ...], ...],
) -> tuple[tuple[sp.Expr, ...], ...]:
    return tuple(
        tuple(at(crow, k) + at(drow, k - 1) for k in range(6))
        for crow, drow in zip(crows, drows)
    )


def isolate_convolution(
    rows: tuple[tuple[sp.Expr, ...], ...],
) -> tuple[tuple[sp.Expr, ...], ...]:
    return tuple(
        tuple(at(row, k) + at(row, k - 1) for k in range(6))
        for row in rows
    )


def raw_gamma1() -> sp.Expr:
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in "EUVW")
    t0 = add_xd(crows, drows)
    t1 = add_xd(isolate_convolution(crows), drows)
    return sp.expand(nested(t1, 4) - nested(t0, 4) - nested(crows, 3))


def reconstruct_deepest_q35_form() -> sp.Expr:
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
    cuw = wedges - choose(du, 2) - xu
    cvw = wedges - choose(dv, 2) - xv
    cww = (
        wedges
        - choose(du, 2)
        - choose(dv, 2)
        - xu
        - xv
        + adjacent * (du + dv - 2)
        + common
    )
    duw = d_wedges - choose(ddu, 2) - dxu
    dvw = d_wedges - choose(ddv, 2) - dxv
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
        sp.symbols("cE5"): i5_q35(n, e, wedges, re, q35, r4),
        sp.symbols("dE2"): i2(q, de),
        sp.symbols("dU2"): i2(q - 1, de - ddu),
        sp.symbols("dV2"): i2(q - 1, de - ddv),
        sp.symbols("dW2"): i2(q - 2, de - ddu - ddv + adjacent),
        sp.symbols("dE3"): i3(q, de, d_wedges),
        sp.symbols("dU3"): i3(q - 1, de - ddu, duw),
        sp.symbols("dV3"): i3(q - 1, de - ddv, dvw),
        sp.symbols("dE4"): i4(q, de, d_wedges, dre),
    }
    return sp.factor(raw_gamma1().subs(substitution))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    root = json.loads(ROOT_REPORT.read_text(encoding="utf-8"))
    agent = json.loads(AGENT_REPORT.read_text(encoding="utf-8"))
    assert root["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G1_CONFIGURATION_FORM"
    assert agent["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_CONFIGURATION_REDUCTION_AGENT"

    reconstructed = reconstruct_deepest_q35_form()
    local_symbols = {str(symbol): symbol for symbol in reconstructed.free_symbols}
    local_symbols["C_stars3_E"] = sp.symbols(
        "C_stars3_E", integer=True, nonnegative=True
    )
    agent_form = sp.sympify(agent["form"], locals=local_symbols)
    assert sp.expand(reconstructed - agent_form) == 0

    root_form = sp.sympify(
        root["deepest_singleton_ordinary_form"], locals=local_symbols
    )
    names = {str(symbol): symbol for symbol in agent_form.free_symbols | root_form.free_symbols}
    q35_identity = {
        names["C_three_edge_five"]: (
            names["C_wedges_E"] * (names["edge_count"] - 2)
            - 2 * names["C_connected3_E"]
            - names["C_stars3_E"]
        )
    }
    assert sp.expand(agent_form.subs(q35_identity) - root_form) == 0

    n, e, s, r3, h, q35, r4 = sp.symbols("n e S R3 H Q35 R4")
    root_i5 = sp.expand(
        choose(n, 5)
        - e * choose(n - 2, 3)
        + s * choose(n - 3, 2)
        + (choose(e, 2) - s) * (n - 4)
        - r3 * (n - 4)
        - (s * (e - 2) - 2 * r3 - h)
        + r4
    )
    q35_i5 = i5_q35(n, e, s, r3, q35, r4)
    assert sp.expand(q35_i5.subs(q35, s * (e - 2) - 2 * r3 - h) - root_i5) == 0

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_I5_ROOT_CONFIGURATION_EQUIVALENCE_AUDIT_AGENT",
        "raw_identity": "g1=Gamma_1=N4(T1)-N4(T0)-N3(C)",
        "i5_inclusion_exclusion": {
            "one_edge": "-e*C(n-2,3)",
            "two_edges": "+S*C(n-3,2)+(C(e,2)-S)*(n-4)",
            "three_edges": "-R3*(n-4)-Q35",
            "four_edges": "+R4",
            "why_complete": (
                "A k-edge subforest has at least k+1 incident vertices. Thus only "
                "k<=4 can occur inside a five-set. For k=3 the contributing types "
                "are a connected tree on four vertices or a wedge plus a disjoint "
                "edge on five; for k=4 only a connected five-vertex tree contributes."
            ),
        },
        "q35_identity": {
            "formula": "Q35=S(e-2)-2R3-H",
            "proof": (
                "Count a chosen wedge and a third distinct edge. A three-edge path "
                "contributes two wedges, a 3-star contributes three, and a wedge-plus-"
                "disjoint-edge set contributes one. Hence S(e-2)=2R3+H+Q35."
            ),
        },
        "symbolic_checks": {
            "independent_raw_Gamma1_reconstruction_matches_agent_Q35_form": True,
            "agent_Q35_form_maps_exactly_to_root_H_form": True,
            "root_and_Q35_i5_formulas_are_identical": True,
        },
        "dependencies": {
            ROOT_REPORT.name: sha256(ROOT_REPORT),
            AGENT_REPORT.name: sha256(AGENT_REPORT),
        },
        "scope": (
            "Exact algebra/provenance audit for the p-distinct deepest-ordinary g1 "
            "configuration only; positivity comes from the separate theorem."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
