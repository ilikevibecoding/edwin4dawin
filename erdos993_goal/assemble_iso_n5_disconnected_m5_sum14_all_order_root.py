#!/usr/bin/env python3
"""Fail-closed assembly of the exact all-order disconnected-M5 sum14 proof."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum14_ratio_cone_root import (
    MARKER as PROBE_MARKER,
    sum14_lower_bound,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    finite_active_root_certificate,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum14_all_order_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM14_ALL_ORDER_ROOT"

DEPENDENCIES = {
    "probe_iso_n5_disconnected_m5_sum14_ratio_cone_root.py":
        "A2336540F23FE19275CDCB7B2B22664752CE6AC8211F75B94FF14289112F2170",
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
    "high": (
        "iso_n5_disconnected_m5_sum14_ratio_cone_high_root_20260830.json",
        "D5DFF5FEE7C8A2E6E7C20A1E1E90CB1DEC3386421142520C2FDADA153E56F200",
        55,
        10719,
    ),
    "low": (
        "iso_n5_disconnected_m5_sum14_ratio_cone_low_root_20260830.json",
        "A4288E0D77BDAF862C2717B67472E2E328E6A11E91CF81E3C295E470CBCB84B4",
        165,
        32157,
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    cones = {}
    for sector, (name, expected_hash, rows, terms) in REPORTS.items():
        path = HERE / name
        assert sha256(path) == expected_hash, name
        report = load(path)
        assert report["marker"] == PROBE_MARKER
        assert report["source_sha256"] == DEPENDENCIES[
            "probe_iso_n5_disconnected_m5_sum14_ratio_cone_root.py"
        ]
        assert report["sector"] == sector
        assert report["denominator"] == "960*n**3"
        assert report["cube_rows"] == rows
        assert report["simplex_terms"] == terms
        assert report["negative"] == 0
        assert report["zero"] == 0
        assert sp.Rational(report["minimum"]) == 1
        assert len(report["row_audits"]) == rows
        assert all(row["negative"] == 0 for row in report["row_audits"])
        cones[sector] = report

    expressions = unique_expressions(interval_cells(P, H))
    finite = finite_active_root_certificate(expressions, [13])
    assert finite["unlabeled_trees"] == 2288
    assert finite["root_checks"] == 27919
    assert finite["interval_checks"] == 27919
    assert finite["global_minima_proved_sums"] == [0]

    (_, _, _), lower = sum14_lower_bound()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every active rooted-tree pair P=T-u, H=T-N[u], unique "
            "disconnected-M5 Psi interval sum 14 is nonnegative at every order."
        ),
        "exact_interval": {
            "unique_expression_index_one_based": 14,
            "deletion_coefficients": {
                "d1": "-p2+3p4/2",
                "d2": "-n-3p3/2",
                "d3": "-3p2/2-1/2",
                "d4": "3n/2",
                "d5": "3",
                "d6": "0",
            },
            "substitutions": {
                "d1": "s",
                "d2": "binom(s,2)+s(n-s)-q",
                "d3_upper": "p3",
                "d4_lower": (
                    "binom(s,4)+binom(s,3)(n-s)-binom(s-1,2)q"
                ),
                "d5_lower": (
                    "binom(s,5)+binom(s,4)(n-s)-binom(s-1,3)q"
                ),
            },
            "resulting_lower_bound": str(lower),
        },
        "large_order_certificate": {
            "range": "n>=13, 1<=s<=n, 0<=q<=n-s",
            "edge_identity": "rho1=4p2/n=2n-6+4s/n",
            "extension_ceiling": "rho5=12p6/p5<=2(n-5)",
            "forest_cones": {
                "high": "all four successive rho drops are at least 1",
                "low": (
                    "rho1-rho2=a in [0,1], rho2-rho3>=2-a, and the "
                    "next two drops are at least 1"
                ),
            },
            "parameterization": (
                "s=1+r(n-1), q=v(n-s), rho5=2(n-5)w; all remaining "
                "ratio slack is distributed on a four-coordinate simplex"
            ),
            "cones": cones,
            "total_homogeneous_terms": 42876,
            "negative_coefficients": 0,
            "minimum_coefficient": "1",
        },
        "small_order_certificate": finite,
        "pinned_dependencies": DEPENDENCIES,
        "pinned_probe_reports": {
            sector: {"file": row[0], "sha256": row[1]}
            for sector, row in REPORTS.items()
        },
        "remaining_disconnected_m5_interval_sums": [15, 16],
        "scope": (
            "This closes unique sum 14 for active disconnected M5 only. It does "
            "not by itself close transported common components, sums 15-16, all "
            "disconnected M5, connected-nonadjacent M5, g1, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_root_checks": finite["root_checks"],
        "large_order_cones": 2,
        "homogeneous_terms": 42876,
        "negative_coefficients": 0,
        "remaining_disconnected_m5_interval_sums": [15, 16],
    }, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
