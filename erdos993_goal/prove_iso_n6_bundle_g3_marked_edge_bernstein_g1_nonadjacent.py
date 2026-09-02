#!/usr/bin/env python3
"""Universal exact theorem for the rank-six bundle coefficient g3.

The proof reconstructs g3 at the four defining Newton nodes, partitions both
C and its induced minor D by marked-set membership, pays the D block by
categorywise containment, and eliminates ranks seven through four by exact
extension counts.  The remaining marked edge/wedge form is certified in five
exhaustive forest geometries.  Orders 2..7 are exhausted literally, orders
8,9 and 10..57 use fixed exact Bernstein certificates, and n>=58 uses one
tail certificate with nonnegative power coefficients.

Only rank-six bundle g3 is claimed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent as structure
import explore_iso_n6_bundle_g3_universal_cone_g1_nonadjacent as cone
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    certify_bernstein,
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / "iso_n6_bundle_g3_marked_edge_bernstein_exact_g1_nonadjacent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G3_MARKED_EDGE_BERNSTEIN_G1_NONADJACENT"

FILES = {
    "algebra_source": "derive_iso_n6_bundle_polynomial_root.py",
    "algebra_report": "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
    "independent_algebra_source": "audit_iso_n6_bundle_algebra_finite_g2_transfer_audit.py",
    "independent_algebra_report": (
        "iso_n6_bundle_algebra_finite_independent_audit_exact_"
        "g2_transfer_audit_20260830.json"
    ),
    "g4_geometry_source": "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py",
    "g4_geometry_report": (
        "iso_n6_bundle_g4_marked_edge_bernstein_exact_"
        "g1_bernstein_20260830.json"
    ),
    "partition_source": "explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent.py",
    "cone_source": "explore_iso_n6_bundle_g3_universal_cone_g1_nonadjacent.py",
}

EXPECTED_HASHES = {
    "algebra_source": "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    "algebra_report": "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    "independent_algebra_source": "443271843C72AE45D7CB3594664034DE64507D500017AA958EEDE6AD03F792B2",
    "independent_algebra_report": "C08ED6BB86ADCB6F4F49726C7F1C2E436DCCBDFF1343FA12EFD1EA399613BEEC",
    "g4_geometry_source": "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
    "g4_geometry_report": "664BEF48E70853EEE3C277590385F412CBAA262E424E52E2B4D184AA507B82E3",
    # Filled only after the two local algebra sources are frozen.
    "partition_source": "DA4B06496D8FCE96A62A3A7161481610EC4128141A515A213FC2DB6E8195DCB6",
    "cone_source": "3F803A19005B39C8EFA84997630354CBF0CD4A2D7133F2FE10A238D279A29B5C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial_nonnegative(expression, variables):
    if not variables:
        return sp.expand(expression) >= 0
    polynomial = sp.Poly(sp.expand(expression), *variables)
    return all(value >= 0 for value in polynomial.coeffs())


def main():
    actual_hashes = {label: sha256(HERE / name) for label, name in FILES.items()}
    assert all(
        expected == "TO_BE_FROZEN" or actual_hashes[label] == expected
        for label, expected in EXPECTED_HASHES.items()
    )
    g4_report = json.loads((HERE / FILES["g4_geometry_report"]).read_text())
    assert g4_report["marker"] == (
        "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G4_MARKED_EDGE_BERNSTEIN_G1_BERNSTEIN"
    )
    assert len(g4_report["edge_wedge_geometry"]["five_branches"]) == 5

    # Independent four-node reconstruction and exact match to the frozen
    # rank-six algebra producer.
    raw, gamma = structure.reconstruct_g3()
    assert len(gamma) == 4
    algebra = json.loads((HERE / FILES["algebra_report"]).read_text())
    frozen_raw = sp.sympify(algebra["binomial_coefficients"][3]["factor"])
    assert sp.expand(raw - frozen_raw) == 0
    partitioned = cone.reconstruct_partitioned()
    structural, _ = structure.structural_substitution()
    cpart, _ = structure.partition_substitution("C", "c", 7)
    dpart, _ = structure.partition_substitution("D", "d", 6)
    assert sp.expand(partitioned - raw.subs(structural).subs(cpart).subs(dpart)) == 0

    names = {str(symbol): symbol for symbol in partitioned.free_symbols}
    get = names.__getitem__
    n = get("n")
    dvars = tuple(sorted(
        (symbol for symbol in partitioned.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    expected_d = {
        "DA3": -7*get("CB3") - get("CW2") - 7*get("CW3") + 2*n - 2,
        "DA4": 12*get("CB2") + 5*get("CW2") + 2*n - 2,
        "DA5": 5*n - 18,
        "DA6": -7,
        "DB3": -7*get("CA3") - get("CW2") - 7*get("CW3") + 2*n - 2,
        "DB4": 12*get("CA2") + 5*get("CW2") + 2*n - 2,
        "DB5": 5*n - 18,
        "DB6": -7,
        "DW2": (
            2*get("CA2") - get("CA3") - 7*get("CA4")
            + 2*get("CB2") - get("CB3") - 7*get("CB4")
            + 2*get("CW2") - 2*get("CW3") - 7*get("CW4")
            + 2*get("CZ2") - 7*get("CZ4")
        ),
        "DW3": (
            2*get("CA2") + 5*get("CA3") + 2*get("CB2") + 5*get("CB3")
            + 2*get("CW2") - 2*get("CW3") + 12*get("CZ3") + 4*n - 4
        ),
        "DW4": 5*get("CA2") + 5*get("CB2") + 10*get("CW2") - 7*get("CZ2") + 2*n - 4,
        "DW5": -2*(n + 6),
        "DW6": -7,
        "DZ4": 2 - 7*get("CW2"),
        "DZ5": 12*(n - 2),
        "DZ6": -7,
    }
    assert {str(value) for value in dvars} == set(expected_d)
    assert all(
        sp.expand(sp.diff(partitioned, value) - expected_d[str(value)]) == 0
        for value in dvars
    )
    lower, lower_names = cone.coarse_d_lower(partitioned)
    assert lower_names == names

    # Every D category injects into the corresponding C category.  The exact
    # derivative list above verifies term by term that lower is obtained only
    # by discarding positive pieces or replacing a negative D category by its
    # matching C cap.  DW4 is nonnegative for n>=8 because Z2<=1.
    assert sp.expand(expected_d["DW4"].subs({get("CA2"): 0, get("CB2"): 0, get("CW2"): 0, get("CZ2"): 1}) - (2*n - 11)) == 0

    reduced, top_rows = cone.apply_high_caps(lower, names)
    t8 = sp.Symbol("t8", integer=True, nonnegative=True)
    assert [name for name, _ in top_rows] == [
        "CA7", "CB7", "CW7", "CZ7", "CA6", "CB6", "CW6", "CZ6",
        "CA5", "CB5", "CW5",
    ]
    for _, derivative in top_rows:
        variables = tuple(sorted(
            (-derivative).subs(n, t8 + 8).free_symbols,
            key=str,
        ))
        assert polynomial_nonnegative((-derivative).subs(n, t8 + 8), variables)

    # Tail signs for n>=10.
    c_a4 = sp.factor(sp.diff(reduced, get("CA4")))
    c_b4 = sp.factor(sp.diff(reduced, get("CB4")))
    c_w4 = sp.factor(sp.diff(reduced, get("CW4")))
    c_z4 = sp.factor(sp.diff(reduced, get("CZ4")))
    c_z5 = sp.factor(sp.diff(reduced, get("CZ5")))
    assert c_z4 == 8*get("CW2") + 8*get("CW3") + 13*n - 23
    assert sp.expand(c_z5 - (80*get("CW2") - 26*n**2 + 101*n - 45)/10) == 0
    w2_floor = (n - 3)*(n - 4)/2
    w2_cap = (n - 2)*(n - 3)/2
    w3_floor = (n - 3)*(n - 4)*(n - 8)/6
    z5_floor_coefficient = sp.factor(c_z5.subs(get("CW2"), w2_floor))
    assert sp.expand(z5_floor_coefficient - (14*n**2 - 179*n + 435)/10) == 0
    t10 = sp.Symbol("t10", integer=True, nonnegative=True)
    assert polynomial_nonnegative(z5_floor_coefficient.subs(n, t10 + 10), (t10,))

    p_a4 = 103*n**3 - 594*n**2 - 439*n + 2610
    bracket_a4 = -120*c_a4
    upper_a4_fixed = sp.expand(
        (270*n - 870)*(n - 2)
        + (30*n - 1710)*w2_floor - 1920*w3_floor + p_a4
    )
    upper_a4_tail = sp.expand(
        (270*n - 870)*(n - 2)
        + (30*n - 1710)*w2_cap - 1920*w3_floor + p_a4
    )
    assert sp.expand(upper_a4_fixed + 2*(101*n**3 - 1758*n**2 + 8722*n - 12405)) == 0
    assert sp.expand(upper_a4_tail + 2*(101*n**3 - 1773*n**2 + 9622*n - 14970)) == 0
    assert polynomial_nonnegative((-upper_a4_fixed).subs(n, t10 + 10), (t10,))
    t58 = sp.Symbol("t58", integer=True, nonnegative=True)
    assert polynomial_nonnegative((-upper_a4_tail).subs(n, t58 + 58), (t58,))
    assert sp.expand(c_a4.xreplace({get("CA2"): get("CB2"), get("CB2"): get("CA2"), get("CA3"): get("CB3"), get("CB3"): get("CA3")}) - c_b4) == 0

    w4_bracket_lower = sp.expand(
        (-24*n + 84)*w2_cap + 12*n**3 - 44*n**2 - 100*n + 147
    )
    assert sp.expand(w4_bracket_lower - (58*n**2 - 382*n + 399)) == 0
    t6 = sp.Symbol("t6", integer=True, nonnegative=True)
    assert polynomial_nonnegative(w4_bracket_lower.subs(n, t6 + 6), (t6,))

    floor_i3 = lambda h: (h - 1)*(h - 2)*(h - 6)/6
    strong = sp.expand(reduced.subs({
        get("CZ5"): 0,
        get("CZ4"): 0,
        get("CA4"): floor_i3(get("CA2")),
        get("CB4"): floor_i3(get("CB2")),
        get("CW4"): (n - 5)*get("CW3")/4,
    }))
    strong_d_a3 = sp.factor(sp.diff(strong, get("CA3")))
    expected_strong_d_a3 = (
        16*get("CB2")**3 - 144*get("CB2")**2 + 476*get("CB2")
        + 96*get("CB3") + 336*get("CW2")
        - (3*n - 171)*get("CW3") + 168*n - 468
    )/12
    assert sp.expand(strong_d_a3 - expected_strong_d_a3) == 0
    strong_base = sp.expand(strong.subs({get("CA3"): 0, get("CB3"): 0}))
    strong_tail = sp.expand(strong_base - (n - 57)*get("CW3")/4*(
        get("CA2")*(get("CA2") - 1)/2
        + get("CB2")*(get("CB2") - 1)/2
    ))

    # Orders 8 and 9: keep the still-negative A4/B4 and Z5 pieces with their
    # exact extension caps, then prove the remaining A3/B3 monotonicity.
    low_a4 = ((870 - 270*n)*get("CB2") - p_a4)/120
    low_b4 = ((870 - 270*n)*get("CA2") - p_a4)/120
    low_z5 = (-26*n**2 + 101*n - 45)/10
    low89 = sp.expand(
        reduced
        - c_a4*get("CA4") - c_b4*get("CB4")
        - c_w4*get("CW4") - c_z4*get("CZ4") - c_z5*get("CZ5")
        + low_a4*(n - 4)*get("CA3")/3
        + low_b4*(n - 4)*get("CB3")/3
        + c_w4*(n - 5)*get("CW3")/4
        + (c_z4 + low_z5*(n - 4)/3)*get("CZ4")
    )
    for order in (8, 9):
        assert polynomial_nonnegative(
            sp.expand((c_a4 - low_a4).subs(n, order)),
            tuple(sorted((c_a4 - low_a4).free_symbols - {n}, key=str)),
        )
        effective_z4_floor = sp.expand(
            (c_z4 + low_z5*(n - 4)/3).subs({n: order, get("CW2"): ((order - 3)*(order - 4)/2), get("CW3"): 0})
        )
        assert effective_z4_floor > 0
    low89 = sp.expand(low89.subs(get("CZ4"), 0))
    d_a8 = sp.factor(sp.diff(low89, get("CA3")).subs(n, 8))
    d_a9 = sp.factor(sp.diff(low89, get("CA3")).subs(n, 9))
    assert sp.expand(60*d_a8 - (-80*get("CB2") + 480*get("CB3") + 1680*get("CW2") + 735*get("CW3") - 3872)) == 0
    assert sp.expand(3*d_a9 - (-26*get("CB2") + 24*get("CB3") + 84*get("CW2") + 36*get("CW3") - 759)) == 0
    assert (-80*6 + 1680*10 - 3872) > 0
    assert (-26*7 + 84*15 - 759) > 0
    low89_base = sp.expand(low89.subs({get("CA3"): 0, get("CB3"): 0}))

    # Rename C-category symbols to the canonical edge-geometry names.
    geometry_symbols = {
        get(f"C{family}{rank}"): sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 8)
    }
    low89_geometry = sp.expand(low89_base.subs(geometry_symbols))
    fixed_geometry = sp.expand(strong_base.subs(geometry_symbols))
    tail_geometry = sp.expand(strong_tail.subs(geometry_symbols))
    a, b, c, d = sp.symbols("a b c d", nonnegative=True)

    low_summaries = []
    for order in (8, 9):
        for branch in marked_geometry_branches(sp.Integer(order - 2), a, b, c, d):
            label, variables, value = cone.substitute_geometry_with_wedge_floor(
                low89_geometry, n, sp.Integer(order), branch
            )
            summary = certify_bernstein(value, variables, strict=False)
            summary.update({"order": order, "geometry": label})
            low_summaries.append(summary)

    fixed_summaries = []
    for order in range(10, 58):
        for branch in marked_geometry_branches(sp.Integer(order - 2), a, b, c, d):
            label, variables, value = cone.substitute_geometry_with_wedge_floor(
                fixed_geometry, n, sp.Integer(order), branch
            )
            summary = certify_bernstein(value, variables, strict=False)
            summary.update({"order": order, "geometry": label})
            fixed_summaries.append(summary)

    tail_summaries = []
    tail_n = t58 + 58
    for branch in marked_geometry_branches(tail_n - 2, a, b, c, d):
        label, variables, value = cone.substitute_geometry_with_wedge_floor(
            tail_geometry, n, tail_n, branch
        )
        summary = certify_bernstein(value, variables, tail=t58, strict=False)
        summary["geometry"] = label
        tail_summaries.append(summary)

    finite = structure.hostile_finite_scan()
    assert finite["unordered_marked_C_cells"] == 1224
    assert finite["arbitrary_induced_D_cells"] == 122512
    assert finite["arbitrary_induced_D_negative_count"] == 0
    assert finite["forest_preserving_support_cells"] == 28884
    assert finite["forest_preserving_support_negative_count"] == 0

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g3",
        "theorem": (
            "For every finite marked forest C and every induced marked minor D of C, "
            "the rank-six whole-sibling-bundle binomial coefficient g3 is nonnegative."
        ),
        "consequence": (
            "In particular g3 is nonnegative in every forest-realizable canonical "
            "rank-six bundle cell; no five-mode sign split is required."
        ),
        "algebra": {
            "literal_newton_nodes": [0, 1, 2, 3],
            "identity": "g3=Gamma_3-3Gamma_2+3Gamma_1-Gamma_0",
            "matches_frozen_rank_six_polynomial": True,
            "partitioned_terms": len(sp.Poly(partitioned, *sorted(partitioned.free_symbols, key=str)).terms()),
        },
        "marked_partition": {
            "C": "CW neither, CA v-only, CB u-only, CZ both marks",
            "D": "the same four disjoint categories in the induced minor",
            "containment": "each D category injects into the matching C category",
            "D_derivatives": {key: str(sp.factor(value)) for key, value in expected_d.items()},
        },
        "high_rank_extension": {
            "cap_derivatives": [{"variable": label, "coefficient": str(value)} for label, value in top_rows],
            "facts": [
                "6A7<=(n-7)A6, 5A6<=(n-6)A5, 4A5<=(n-5)A4 and B analogues",
                "7W7<=(n-8)W6, 6W6<=(n-7)W5, 5W5<=(n-6)W4",
                "5Z7<=(n-6)Z6 and 4Z6<=(n-5)Z5",
            ],
        },
        "forest_count_bounds": {
            "W2_floor": str(w2_floor),
            "W2_cap": str(w2_cap),
            "W3_floor": str(w3_floor),
            "A4_B4_floor": "i3(H)>=(h-1)(h-2)(h-6)/6 for the corresponding available forest H of order h",
            "A3_B3_cap": "i2(H)<=C(h,2)",
        },
        "edge_wedge_geometry": {
            "five_branches": [row["geometry"] for row in tail_summaries],
            "identity": "W2=C(m,2)-e; W3=C(m,3)-e(m-2)+Omega, m=n-2",
            "wedge_interval": "2e-m<=Omega<=e^2/2",
            "lower_proof": "sum_v C(deg(v),2)>=sum_v(deg(v)-1) over nonisolated vertices>=2e-m",
            "upper_proof": "wedges are a subset of unordered edge pairs",
            "coverage": g4_report["edge_wedge_geometry"]["coverage"],
        },
        "orders_2_through_7": finite,
        "orders_8_and_9": {
            "branches": low_summaries,
            "total_bernstein_coefficients": sum(row["bernstein_coefficients"] for row in low_summaries),
        },
        "orders_10_through_57": {
            "branches": fixed_summaries,
            "total_bernstein_coefficients": sum(row["bernstein_coefficients"] for row in fixed_summaries),
        },
        "orders_58_and_above": {
            "tail": "t=n-58>=0",
            "branches": tail_summaries,
            "total_bernstein_coefficients": sum(row["bernstein_coefficients"] for row in tail_summaries),
            "all_tail_power_coefficients_nonnegative": True,
        },
        "dependencies_sha256": actual_hashes,
        "scope": (
            "Universal exact sign theorem only for rank-six bundle g3. It does not "
            "prove g1 or g2, the complete rank-six bundle lemma, all-N6, higher "
            "ranks, the Newton-tail bridge, or Erdos Problem 993."
        ),
        "source_sha256": sha256(SOURCE),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_induced_D_cells": finite["arbitrary_induced_D_cells"],
        "finite_support_cells": finite["forest_preserving_support_cells"],
        "low_bernstein": report["orders_8_and_9"]["total_bernstein_coefficients"],
        "fixed_bernstein": report["orders_10_through_57"]["total_bernstein_coefficients"],
        "tail_bernstein": report["orders_58_and_above"]["total_bernstein_coefficients"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
