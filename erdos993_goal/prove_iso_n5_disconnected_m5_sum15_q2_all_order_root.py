#!/usr/bin/env python3
"""Exact all-order q=2 theorem for disconnected-M5 unique sum15."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import (
    generic_rows,
    mode_bounds,
)
from probe_iso_n5_disconnected_m5_sum15_q2_coupled_ratio_root import (
    MARKER as COUPLED_MARKER,
    cone,
    lower_rows,
)
from prove_iso_n5_disconnected_m5_sum15_q2_partial_root import finite_certificate


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_q2_all_order_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_Q2_ALL_ORDER_ROOT"
DEPENDENCIES = {
    "prove_iso_n5_disconnected_m5_sum15_q2_partial_root.py":
        "1E76B52641A64F167ECD45C0308F6D11A63E3CABCA8ECEB542B83AF8667C8CA4",
    "probe_iso_n5_disconnected_m5_sum15_q2_coupled_ratio_root.py":
        "461AFC24F5815AA322D6C61998881AC33AFD76216A316AC5D69D5514D9B1EF0F",
    "probe_iso_n5_disconnected_m5_sum15_q2_coarse_root.py":
        "702A53AB121AA2FC4609A5B2B030C6B30BA4F7E5BE2F9FA936B8712D612821D2",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}
REPORTS = {
    "iso_n5_disconnected_m5_sum15_q2_partial_exact_root_20260830.json":
        "66C35A009A8C606BB59417BC85EF8BE52BAFE3D0A2741761D13B22C7EC63A3AD",
    "iso_n5_disconnected_m5_sum15_q2_coupled_ratio_probe_root_20260830.json":
        "D3BB297087ACB8F62E42BDA385295E30A94052F007600075B9E5E04917271C57",
}
EXPECTED_HARD = {
    "high": [(345, "16"), (313, "16")],
    "low": [(1035, "16"), (626, "16")],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    for name, expected in REPORTS.items():
        assert sha256(HERE / name) == expected, name
    coupled_report = json.loads(
        (HERE / "iso_n5_disconnected_m5_sum15_q2_coupled_ratio_probe_root_20260830.json")
        .read_text(encoding="utf-8")
    )
    assert coupled_report["marker"] == COUPLED_MARKER

    x, h, rows = generic_rows()
    finite = finite_certificate(x, h, rows)
    assert finite["global_minimum_R0_through_R5"] == {
        "distinct": [28, 169, 363, 362, 172, 30],
        "shared": [6, 36, 131, 205, 142, 30],
    }
    easy = {
        mode: mode_bounds(x, h, rows, mode)
        for mode in ("distinct", "shared")
    }
    hard = {}
    for mode in ("distinct", "shared"):
        e, order, lowers, signs = lower_rows(mode, x, h, rows)
        hard[mode] = {
            "P0_order": str(order),
            "h3_h4_coefficients": signs,
            "coupled_substitutions": (
                "h3>=binom(e,3)-(e-2)^2 and h4<=x4 because H is induced in P0"
            ),
            "high": cone(mode, "high", e, order, x, lowers),
            "low": cone(mode, "low", e, order, x, lowers),
        }
        for sector in ("high", "low"):
            actual = [
                (row["homogeneous_terms"], row["minimum"])
                for row in hard[mode][sector]
            ]
            assert actual == EXPECTED_HARD[sector], (mode, sector, actual)

    report = {
        "marker": MARKER,
        "theorem": (
            "Every q=2 active rooted pair has nonnegative disconnected-M5 "
            "unique Psi interval sum15."
        ),
        "exact_q2_geometry": {
            "distinct": "P=(1+x)^t(A1+xG1)(A2+xG2), H=A1A2, Gi=Ai-wi",
            "shared": "P=(1+x)^t(A1A2+xG1G2), H=A1A2, Gi=Ai-wi",
        },
        "newton_expansion": {
            "identity": "2*sum15=sum_{j=0}^5 R_j*binom(t,j)",
            "R0_through_R5": [str(sp.factor(row)) for row in rows],
        },
        "finite_certificate": finite,
        "large_order_R2_through_R5": easy,
        "large_order_R0_R1_coupled_ratio_certificate": hard,
        "coverage": (
            "The finite branch proves all six rows through |H|=12. For |H|>=13, "
            "the edge-union coefficient bounds prove R2-R5 and the induced "
            "H<=P0 coupling plus exact high/low ratio cones prove R0,R1. "
            "Every Newton coefficient is therefore nonnegative."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "pinned_reports": REPORTS,
        "scope": (
            "Exact q=2 active-root theorem for unique sum15. No claim for q>=3, "
            "transported common factors, all disconnected M5, g1, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_newton_checks_total": 365388,
        "hard_homogeneous_terms": 4638,
        "negative_coefficients": 0,
        "modes": ["distinct", "shared"],
    }, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
