#!/usr/bin/env python3
"""Exact all-order singleton-endpoint g1 theorem when the parent mark is isolated.

In the canonical mode p=u, assume u is isolated in the marked remainder C.
Writing P=I(C-{u,v}) and H=I(C-{u}-N[v]), the corrected deletion identity
reduces the only new payment to a six-row Newton polynomial F(P,H,t).

Selected isolated P-components are extracted into t.  Every Newton row is
checked on all reduced componentwise-deletion cores through order 12 and by
exact high/low forest-ratio cones from order 13 onward.  The universal S and
all-forest N4 theorems then give g1=S+N4(C)+F>=0.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_g1_singleton_endpoint_u_isolated_cone_g1_nonadjacent import (
    exact_sector,
    finite_certificate,
    generic_rows,
    lowered_expression,
    residual,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_singleton_endpoint_u_isolated_all_order_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_ISOLATED_ALL_ORDER_G1_NONADJACENT"

PINS = {
    "derive_iso_n5_g1_singleton_endpoint_corrected_residual_g1_nonadjacent.py":
        "8100E7B132606481575C681088C30F8B7D6308E670162AC3B96E5C92982C6C89",
    "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json":
        "5E277A78168DE1978C9AACD6AFF12F55A624F4D8CCF4017CA290406106A3C3B1",
    "probe_iso_n5_g1_singleton_endpoint_u_isolated_cone_g1_nonadjacent.py":
        "261260B8A75AADB8B19989F3BCF3AADF8113B8D707DDC834F6F91E83902D701F",
    "iso_n5_g1_singleton_endpoint_u_isolated_cone_probe_g1_nonadjacent_20260830.json":
        "E4546CABCA000B43F6726DA1CDF70B72EA60E311A255FB5D8E2537573BAEA7F7",
    "probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent.py":
        "72795F07C3C0A30CF0B6E05C2980AA97367763EEC6AC8B43514F873AA23D6CFF",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    "TWO_STEP_FACTORIAL_DROP_FOREST_CERTIFICATE_2026-07-27.md":
        "C84F064D4E980F0CCA7AA5853385940AE0892BCE4932A37799824DA3B11C2DC1",
    "verify_two_step_factorial_drop_forest_certificate.py":
        "C9EE3DE3E13499FC9863649481D98413E4BA7B7FEE231DC371DC518FB15B6EF6",
    "assemble_iso_n5_s_all_marked_forests_root.py":
        "E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
    "iso_n5_s_all_marked_forests_exact_root_20260830.json":
        "E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
    "assemble_iso_all_forest_n4_bundle_induction_root.py":
        "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "iso_all_forest_n4_bundle_induction_exact_root_20260829.json":
        "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py":
        "E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
    "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json":
        "0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def identity_and_endpoint_audit():
    p, h, rows = generic_rows()
    assert len(rows) == 6
    # Independently recheck the displayed residual before using the Newton rows.
    expected = sp.expand(
        2*h[1]*p[2] + h[1]*p[3] - 5*h[1]*p[4]
        + 2*h[2]*p[1] - 2*h[2]*p[2] + 3*h[2]*p[3]
        + h[3]*p[1] + 3*h[3]*p[2] - 5*h[4]*p[1]
        + 2*p[1]*p[3] - 5*p[1]*p[5] + 2*p[2]**2
        - 2*p[2]*p[4] + 3*p[3]**2
    )
    assert sp.expand(residual(p, h) - expected) == 0

    _p, core, _lowered, geometry = lowered_expression()
    N, A, B, Q = core
    records = geometry["endpoint_records"]
    expected_h3 = [
        N * (3*N - 7 + 3*A + 6*B*(1-A)) / 2,
        3*N + 1,
        sp.Integer(3), 0, 0, 0,
    ]
    expected_h4 = [-5*N, -5, 0, 0, 0, 0]
    for index, record in enumerate(records):
        assert sp.expand(record["h3_coefficient"] - expected_h3[index]) == 0
        assert sp.expand(record["h4_coefficient"] - expected_h4[index]) == 0
        assert record["h3_endpoint"] == "lower"
        assert record["h4_endpoint"] == "upper"
    # For N=13+s, the first h3 coefficient is visibly positive.
    s = sp.symbols("s", nonnegative=True)
    first_positive = sp.expand((2 * expected_h3[0] / N).subs(N, 13 + s))
    assert sp.expand(first_positive - (32 + 3*s + 3*A + 6*B*(1-A))) == 0
    return {
        "newton_rows": [str(sp.factor(row)) for row in rows],
        "endpoint_coefficients": [
            {"row": i, "h3": str(sp.factor(expected_h3[i])), "h4": str(expected_h4[i])}
            for i in range(6)
        ],
        "h3_floor": "i3(H)>=C(e,3)-e(H)*(e-2)",
        "h4_ceiling": "i4(H)<=C(e,4)",
    }


def main():
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    derived = load("iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json")
    pinned_probe = load("iso_n5_g1_singleton_endpoint_u_isolated_cone_probe_g1_nonadjacent_20260830.json")
    scalar = load("iso_n5_s_all_marked_forests_exact_root_20260830.json")
    n4 = load("iso_all_forest_n4_bundle_induction_exact_root_20260829.json")
    n4_audit = load("iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json")
    assert derived["marker"] == "DERIVED_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_CORRECTED_RESIDUAL_G1_NONADJACENT"
    assert derived["correction_terms"] == 11
    assert derived["regression_guard"]["corrected_raw_correction"] == -174
    assert pinned_probe["marker"] == "PROBE_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_ISOLATED_CONE_G1_NONADJACENT"

    identities = identity_and_endpoint_audit()
    finite = finite_certificate()
    assert finite["unlabeled_forests"] == 2949
    assert finite["reduced_patterns"] == 75549
    assert finite["newton_row_checks"] == 453294
    assert finite["global_minimum_newton_rows"] == [0, 0, 2, 21, 44, 25]
    assert finite == pinned_probe["finite"]

    large_rows = [
        exact_sector(sector, row_index)
        for row_index in range(6)
        for sector in ("high", "low")
    ]
    assert large_rows == pinned_probe["large_sectors"]
    assert len(large_rows) == 12
    assert sum(row["cube_bernstein_rows"] for row in large_rows) == 510
    assert sum(row["homogeneous_terms"] for row in large_rows) == 54194
    assert sum(row["power_terms"] for row in large_rows) == 19516
    assert min(Fraction(row["minimum"]) for row in large_rows) == Fraction(1, 2)

    assert scalar["marker"] == "PASS_EXACT_ISO_N5_S_ALL_MARKED_FORESTS_ROOT"
    theorem_n4 = "N4(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    assert n4["marker"] == "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
    assert n4["theorem"] == theorem_n4
    assert n4_audit["marker"] == "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12"
    assert n4_audit["theorem"] == theorem_n4

    report = {
        "marker": MARKER,
        "theorem": (
            "In the canonical singleton_endpoint_p_equals_u mode, if u is isolated "
            "in the marked remainder C, then the rank-five bundle coefficient g1 is nonnegative."
        ),
        "corrected_algebra": {
            "identity": "g1=S(C)+N4(C)+F",
            "F": "N4(D)+B(QE,W)+B(U,QV)",
            "u_isolated_specialization": "QE=U and QV=W, so F=N4(D)+2B(U,W)",
            "raw_correction_terms": 11,
        },
        "componentwise_geometry": {
            "P": "C-{u,v}",
            "H": "C-{u}-N[v]",
            "relation": "P-H is the independent neighbour set N_C(v), at most one vertex per P-component",
            "isolated_selected_extraction": "I(P)=(1+x)^t I(P0)",
            "core_box": (
                "For positive-degree selected vertices: a=NA/2, b=BN(1-A), "
                "q=a+QN(1-A)(1-B), with A,B,Q in [0,1]."
            ),
        },
        "newton_and_endpoint_audit": identities,
        "finite_certificate": finite,
        "large_order_certificate": {
            "core_order": "N>=13",
            "branches": 12,
            "cube_bernstein_rows": 510,
            "homogeneous_coefficients": 54194,
            "negative_coefficients": 0,
            "minimum": "1/2",
            "rows": large_rows,
        },
        "sign_payment": {
            "F": "nonnegative by the finite plus exact large-order componentwise-deletion certificate",
            "S": "nonnegative by the universal scalar theorem",
            "N4(C)": "nonnegative by the all-forest N4 theorem and its independent audit",
            "conclusion": "g1=S(C)+N4(C)+F>=0",
        },
        "dependencies_sha256": PINS,
        "scope": (
            "This closes only the u-isolated subfamily of singleton_endpoint_p_equals_u "
            "(and the symmetric v-isolated orientation after exchanging marks).  Nonisolated "
            "endpoint parents, singleton_ordinary, both internal modes, g2, all N5, and "
            "Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_patterns": finite["reduced_patterns"],
        "finite_checks": finite["newton_row_checks"],
        "large_branches": 12,
        "large_coefficients": 54194,
        "theorem": report["theorem"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
