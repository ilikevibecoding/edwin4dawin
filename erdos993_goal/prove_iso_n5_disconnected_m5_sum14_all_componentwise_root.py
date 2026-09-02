#!/usr/bin/env python3
"""Fail-closed all-order componentwise-deletion theorem for unique sum14."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum14_ratio_cone_root import sum14_lower_bound


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum14_all_componentwise_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM14_ALL_COMPONENTWISE_ROOT"

DEPENDENCIES = {
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "probe_iso_n5_disconnected_m5_sum12_ratio_cone_root.py":
        "E168927805B669F7738B0B7C9BC8BE02F89B343FD056378853C9B9890EF5B2F4",
    "probe_iso_n5_disconnected_m5_sum14_ratio_cone_root.py":
        "A2336540F23FE19275CDCB7B2B22664752CE6AC8211F75B94FF14289112F2170",
    "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    "probe_iso_n5_disconnected_m5_sum14_componentwise_ratio_root.py":
        "610FDB7B974378999E780C10932D52431F292FFA0467270DAB04FA1C70B32475",
    "prove_iso_n5_disconnected_m5_sum14_finite_componentwise_root.py":
        "A7FF7B1F916E80F6A60D4EDD927F68BA4E4EBFDD0819FE6B7CD6A8E093BBFDD2",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}

FINITE = (
    "iso_n5_disconnected_m5_sum14_finite_componentwise_exact_root_20260830.json",
    "05817B4B84601D3AA2CE0183E4AAB541ECF31126258749675390C24F3508B9E3",
)

CONES = {
    ("positive_s", "high"): (
        "iso_n5_disconnected_m5_sum14_componentwise_positive_high_ratio_probe_root_20260830.json",
        "DBBA42D3E85092C91E04DBA6873E60B93998B59A72454D971AEFEBAB03031F3E",
        180, 35073,
    ),
    ("positive_s", "low"): (
        "iso_n5_disconnected_m5_sum14_componentwise_positive_low_ratio_probe_root_20260830.json",
        "E25EC1D6C5096CB3FD83FE63FF16D0C05B73950631F96E42FE57D952A6A44EF0",
        540, 105219,
    ),
    ("q0", "high"): (
        "iso_n5_disconnected_m5_sum14_componentwise_q0_high_ratio_probe_root_20260830.json",
        "21FCBCC2CC959CE63B1030B71056551909FF8F66854C506F26F223230DD1073E",
        25, 4870,
    ),
    ("q0", "low"): (
        "iso_n5_disconnected_m5_sum14_componentwise_q0_low_ratio_probe_root_20260830.json",
        "99F053C60598D43FC98170B78556C88232FBC2DCEF708A6D2840849F9AFE9F6C",
        75, 14610,
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    finite_name, finite_hash = FINITE
    assert sha256(HERE / finite_name) == finite_hash
    finite = load(finite_name)
    assert finite["marker"] == "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM14_FINITE_COMPONENTWISE_ROOT"
    assert finite["source_sha256"] == DEPENDENCIES[
        "prove_iso_n5_disconnected_m5_sum14_finite_componentwise_root.py"
    ]
    assert finite["unlabeled_forests"] == 2949
    assert finite["componentwise_deletion_patterns"] == 200255
    assert finite["global_minimum_twice_sum14"] == 0
    assert finite["ordered_value_stream_sha256"] == (
        "2367893A100E6F2339E78AEE96CCC8A09225CEA0641B109F77C3555EA92FE86E"
    )

    cones = {}
    total_terms = 0
    for key, (name, expected_hash, cube_rows, terms) in CONES.items():
        assert sha256(HERE / name) == expected_hash, name
        cone = load(name)
        assert cone["marker"] == "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM14_COMPONENTWISE_RATIO_ROOT"
        assert cone["source_sha256"] == DEPENDENCIES[
            "probe_iso_n5_disconnected_m5_sum14_componentwise_ratio_root.py"
        ]
        assert (cone["branch"], cone["sector"]) == key
        assert cone["order_base"] == 13
        assert cone["denominator"] == "960*n**3"
        assert cone["cube_rows"] == cube_rows
        assert cone["simplex_terms"] == terms
        assert cone["negative"] == 0
        assert cone["zero"] == 0
        assert sp.Rational(cone["minimum"]) == 1
        assert all(row["negative"] == 0 and row["zero"] == 0 for row in cone["row_audits"])
        cones[f"{key[0]}_{key[1]}"] = cone
        total_terms += terms
    assert total_terms == 159772

    (n, s, q), lower = sum14_lower_bound()
    report = {
        "marker": MARKER,
        "theorem": (
            "Let P be a forest and S an independent set containing at most one "
            "vertex from each component, with H=P-S. Unique disconnected-M5 "
            "Psi interval sum14(P,H) is nonnegative."
        ),
        "deletion_bound": {
            "exact_d1": "s",
            "exact_d2": "C(s,2)+s(n-s)-q",
            "d3_upper": "p3",
            "d4_lower": "C(s,4)+C(s,3)(n-s)-C(s-1,2)q",
            "d5_lower": "C(s,5)+C(s,4)(n-s)-C(s-1,3)q",
            "coefficient_signs": {
                "d1": "-p2+3p4/2",
                "d2": "-n-3p3/2",
                "d3": "-3p2/2-1/2",
                "d4": "3n/2",
                "d5": "3",
                "d6": "0",
            },
            "resulting_lower_bound": str(lower),
        },
        "finite_certificate": {
            "orders": [0, 12],
            "unlabeled_forests": 2949,
            "literal_componentwise_deletion_patterns": 200255,
            "minimum_twice_sum14": 0,
            "ordered_value_stream_sha256": finite["ordered_value_stream_sha256"],
        },
        "large_order_certificate": {
            "range": "n>=13",
            "component_parameterization": "c=1+r(n-1), e(P)=n-c",
            "case_partition": {
                "no_deletion": "s=q=0",
                "positive_deletion": "s=1+u(c-1), q=v(n-c)",
            },
            "edge_ratio_identity": "rho1=2n-6+4c/n",
            "terminal_ratio_ceiling": "rho5<=2(n-5)",
            "forest_ratio_sectors": {
                "high": "delta1,delta2,delta3,delta4>=1",
                "low": "0<=delta1<=1, delta2>=2-delta1, delta3,delta4>=1",
            },
            "cones": cones,
            "homogeneous_coefficients": total_terms,
            "negative_coefficients": 0,
            "minimum_coefficient": "1",
        },
        "coverage": (
            "The literal census proves n<=12. For n>=13, s=0 forces q=0; "
            "otherwise 1<=s<=c and 0<=q<=n-c. The displayed continuous boxes "
            "contain every physical componentwise-deletion pair, and both forest "
            "ratio sectors are exhaustive."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "pinned_reports": {
            "finite": {"file": finite_name, "sha256": finite_hash},
            **{
                f"{key[0]}_{key[1]}": {"file": row[0], "sha256": row[1]}
                for key, row in CONES.items()
            },
        },
        "scope": (
            "Exact componentwise-deletion theorem for unique sum14 only. It does "
            "not by itself prove the other interval sums, all disconnected M5, "
            "g1, g2, N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "finite_patterns": 200255,
        "large_order_cones": 4,
        "large_homogeneous_coefficients": total_terms,
        "negative_coefficients": 0,
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
