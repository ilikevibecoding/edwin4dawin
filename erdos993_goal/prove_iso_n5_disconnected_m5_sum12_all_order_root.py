#!/usr/bin/env python3
"""Exact all-order certificate for disconnected M5 unique interval sum 12.

The small branch is an exhaustive rooted-tree census.  For n>=13 the proof
uses the active-root deletion geometry, the rank-five forest high/low ratio
theorem, and a sparse/dense split at s=n/4.  Every large-order branch is
certified by exact tensor-Bernstein and homogeneous-simplex coefficients.

This closes one interval sum only.  It does not assert all disconnected M5,
all g1, or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum12_ratio_cone_root import (
    build_sector,
    sum12_lower_bound,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    finite_active_root_certificate,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum12_all_order_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM12_ALL_ORDER_ROOT"

DEPENDENCIES = {
    "probe_iso_n5_disconnected_m5_sum12_ratio_cone_root.py":
        "E168927805B669F7738B0B7C9BC8BE02F89B343FD056378853C9B9890EF5B2F4",
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

REPORT_HASHES = {
    "iso_n5_disconnected_m5_sum12_ratio_cone_sparse_high_root_20260830.json":
        "D39CD65795CCC21E5B0A28A37E3256C6B0A787EE9D333346C82CB30FE7620A09",
    "iso_n5_disconnected_m5_sum12_ratio_cone_sparse_low_root_20260830.json":
        "73C12EEB16ECBEEE401A1D576B5DB9EBAF08F538394706130AD1F74CDFA32D2E",
    "iso_n5_disconnected_m5_sum12_ratio_cone_dense_high_root_20260830.json":
        "ADDB9A8E0B79630707DE0E71761ADB71317E082509BF8468965D4C85CA9658DA",
    "iso_n5_disconnected_m5_sum12_ratio_cone_dense_low_root_20260830.json":
        "389B6DEF2EDDC9CC4E6E188933059D46F8C96C48907D830CBFCBAB13D0049E58",
}

EXPECTED = {
    ("sparse", "high"): (10, 1780, sp.Integer(128), "3072*n**3"),
    ("sparse", "low"): (20, 3560, sp.Integer(128), "3072*n**3"),
    ("dense", "high"): (36, 1117, sp.Rational(1, 72), "1"),
    ("dense", "low"): (72, 2234, sp.Rational(1, 72), "1"),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    # Pin the mutable proof inputs before doing any algebra.
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    for name, expected in REPORT_HASHES.items():
        assert sha256(HERE / name) == expected, name

    expressions = unique_expressions(interval_cells(P, H))
    assert len(expressions) == 16
    finite = finite_active_root_certificate(expressions, [11])
    assert finite["unlabeled_trees"] == 2288
    assert finite["root_checks"] == 27919
    assert finite["interval_checks"] == 27919
    assert finite["global_minima_proved_sums"] == [0]

    # Rebuild every infinite branch from source; do not merely trust JSON.
    cones = {}
    for branch, sector in EXPECTED:
        result = build_sector(sector, branch)
        rows, terms, minimum, denominator = EXPECTED[(branch, sector)]
        assert result["cube_rows"] == rows
        assert result["simplex_terms"] == terms
        assert result["negative"] == 0
        assert result["zero"] == 0
        assert sp.Rational(result["minimum"]) == minimum
        assert result["denominator"] == denominator
        assert result["sample_corner_negative"] == 0
        assert all(row["negative"] == 0 for row in result["row_audits"])
        cones[f"{branch}_{sector}"] = result

    (n, s, q), lower = sum12_lower_bound(use_trivial_d3_cap=True)
    report = {
        "marker": MARKER,
        "theorem": (
            "For every active rooted-tree pair P=T-u, H=T-N[u], unique "
            "disconnected-M5 Psi interval sum 12 is nonnegative at every order."
        ),
        "exact_interval": {
            "unique_expression_index_one_based": 12,
            "deletion_coefficients": {
                "d1": "-(n+p3)",
                "d2": "-1",
                "d3": "-n",
                "d4": "2",
                "d5": "0",
            },
            "substitutions": {
                "d1": "s",
                "d2": "binom(s,2)+s(n-s)-q",
                "d3_upper": "p3, since d3=p3-h3<=p3",
                "d4_lower": (
                    "binom(s,4)+binom(s,3)(n-s)-binom(s-1,2)q"
                ),
            },
            "resulting_lower_bound": str(lower),
        },
        "large_order_certificate": {
            "range": "n>=13, 1<=s<=n, 0<=q<=n-s",
            "edge_identity": (
                "e(P)=n-s, hence p2=binom(n,2)-(n-s) and "
                "rho1=4p2/n=2n-6+4s/n"
            ),
            "ratios": "rho_j=2(j+1)p_(j+1)/p_j for j=1,2,3,4",
            "forest_cones": {
                "high": (
                    "rho1-rho2>=1, rho2-rho3>=1, rho3-rho4>=1"
                ),
                "low": (
                    "a=rho1-rho2 in [0,1], rho2-rho3>=2-a, "
                    "rho3-rho4>=1"
                ),
            },
            "extension_ceiling": "rho4=10p5/p4<=2(n-4)",
            "partition": {
                "sparse": "1<=s<=n/4; s=1+r(n-4)/4",
                "dense": (
                    "n/4<=s<=n; s=n/4+3nr/4 and "
                    "rho4=2(n-4)w"
                ),
                "q": "q=v(n-s)",
                "cube_variables": "0<=r,v,w,a<=1 as applicable",
                "simplex": "all displayed ratio slack coordinates are nonnegative and sum to 1",
            },
            "cones": cones,
            "total_homogeneous_terms": sum(
                result["simplex_terms"] for result in cones.values()
            ),
            "negative_coefficients": 0,
        },
        "small_order_certificate": finite,
        "pinned_dependencies": DEPENDENCIES,
        "pinned_probe_reports": REPORT_HASHES,
        "remaining_disconnected_m5_interval_sums": [14, 15, 16],
        "scope": (
            "This closes unique sum 12 for active disconnected M5 only. It does "
            "not by itself close arbitrary transported common components, sums "
            "14-16, all disconnected M5, connected-nonadjacent M5, g1, or "
            "Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_root_checks": finite["root_checks"],
        "large_order_cones": len(cones),
        "homogeneous_terms": report["large_order_certificate"]["total_homogeneous_terms"],
        "negative_coefficients": 0,
        "remaining_disconnected_m5_interval_sums": [14, 15, 16],
    }, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
