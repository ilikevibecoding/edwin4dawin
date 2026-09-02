#!/usr/bin/env python3
"""Fail-closed all-order theorem for adjacent-mark rank-five C5.

For a forest G with adjacent marked vertices u,v, let

    A=G-u-v,  B=G-N[v],  C=G-N[u].

The exact occupation split is

    C5 = H_C(A)+L_C(A,B)+L_C(A,C)+K_C(B,C).

Orders |A|<=12 are exhausted exactly.  For |A|>=13, acyclicity gives the
correlated edge budget e(A)<=|B|+|C|-|A|.  Path coefficient floors and
edgeless ceilings put the six live B,C coefficients in a rectangular box;
C5 is multi-affine in those coefficients.  The 64 corners are nonnegative
on eight exhaustive order branches by exact tensor Bernstein certificates.

By default this source regenerates every finite and all-order dependency.
Use --reuse-certificates only to validate already frozen reports.

This proves adjacent-mark C5 only.  It does not prove M5+3*C5, g1, all N5,
or Erdos Problem 993.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path
import subprocess
import sys

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_adjacent_all_forest_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_C5_ADJACENT_ALL_FOREST_G1_BERNSTEIN"
PROBE_MARKER = "PROBE_EXACT_ISO_N5_C5_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_G1_BERNSTEIN"
FINITE_MARKER = "PASS_EXACT_FINITE_ISO_N5_C5_ADJACENT_ALL_FOREST_G1_BERNSTEIN"

PROBE_SOURCE = HERE / "probe_iso_n5_c5_adjacent_order_box_edge_budget_flint_g1_bernstein.py"
FINITE_SOURCE = HERE / "census_iso_n5_c5_adjacent_all_forest_g1_bernstein.py"
FINITE_REPORT = HERE / "iso_n5_c5_adjacent_all_forest_finite_census_g1_bernstein_20260830.json"
LARGE_REPORT = HERE / "iso_n5_c5_adjacent_order_box_edge_budget_flint_probe_g1_bernstein_20260830.json"
SMALL_REPORTS = {
    order: HERE / f"iso_n5_c5_adjacent_order_box_edge_budget_small{order}_flint_probe_g1_bernstein_20260830.json"
    for order in range(7)
}

# These hashes pin the exact sources and reports assembled by this theorem.
EXPECTED_HASHES = {
    "probe_iso_n5_c5_adjacent_order_box_edge_budget_flint_g1_bernstein.py":
        "A5A8E4F1A851676FC265E0ACDA40D84270DDE71220513BB9D09FBE40591E06E0",
    "census_iso_n5_c5_adjacent_all_forest_g1_bernstein.py":
        "4913631B222692EC48D06B3A04456677AAD56D3EB9148512649FDEF57234429E",
    "iso_n5_c5_adjacent_all_forest_finite_census_g1_bernstein_20260830.json":
        "2019E01A1164D40734A7F81721FB6B6E959ABE554F7192222C7294EAC6E87EDD",
    "iso_n5_c5_adjacent_order_box_edge_budget_flint_probe_g1_bernstein_20260830.json":
        "C060E8B5829BE513166E321233C401B77FD2B12D81F8622F121A96E1ADE23547",
    "iso_n5_c5_adjacent_order_box_edge_budget_small0_flint_probe_g1_bernstein_20260830.json":
        "57BE1BC43049B0EAB9CE9F94506848908E2A3DA8E8D42232EBA081E7C1C296F8",
    "iso_n5_c5_adjacent_order_box_edge_budget_small1_flint_probe_g1_bernstein_20260830.json":
        "CC4E74E1A9495500AA7FE92213F7F3A9ABA197881C8B60C02F60C86F93B277A8",
    "iso_n5_c5_adjacent_order_box_edge_budget_small2_flint_probe_g1_bernstein_20260830.json":
        "FB482BB2FC0DD32CCDF32070E18BE6B55E765D98D2F852EFEBC420FBA7E2B500",
    "iso_n5_c5_adjacent_order_box_edge_budget_small3_flint_probe_g1_bernstein_20260830.json":
        "70AFAF9567813BCFE99A263A486D9A6A3CCCD8217951DDD47848EFB6874B8C66",
    "iso_n5_c5_adjacent_order_box_edge_budget_small4_flint_probe_g1_bernstein_20260830.json":
        "895CC82A387B2809060ED345DE9A36424FC72D2DD5761F3757FB237EF195AD42",
    "iso_n5_c5_adjacent_order_box_edge_budget_small5_flint_probe_g1_bernstein_20260830.json":
        "7C5622F096214E6D3048862B7E2D4D4048FF530C36A385715E6DC8A156C4AC0A",
    "iso_n5_c5_adjacent_order_box_edge_budget_small6_flint_probe_g1_bernstein_20260830.json":
        "E6828BC521A92E134E249AF3BBF391FA8CDEA42493AF81E52704CB0235AB7CFC",
}

FOUNDATIONAL_HASHES = {
    "RANK8_ROOT_DELETION_RATIO_FLOOR_THEOREM_2026-08-25.md":
        "07B04ED37C1C1FC4DBBCCF834B2D8BB32BDEF0827BD72A4A926342E2998FE998",
    "verify_rank8_root_deletion_attachment_floor_root.py":
        "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    "balanced_flint_mpoly_sum_root.py":
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rerun(command: list[str], expected_marker: str) -> None:
    result = subprocess.run(
        [sys.executable, *command],
        cwd=HERE,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0 or expected_marker not in result.stdout:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise AssertionError((command, result.returncode, expected_marker))
    print(json.dumps({"replayed": command, "marker": expected_marker}), flush=True)


def regenerate_dependencies() -> None:
    rerun([FINITE_SOURCE.name], FINITE_MARKER)
    rerun([PROBE_SOURCE.name], PROBE_MARKER)
    for order in range(7):
        rerun([PROBE_SOURCE.name, "--small-order", str(order)], PROBE_MARKER)


def algebra_certificate() -> dict:
    """Reconstruct the scaled form and independently audit multi-affinity."""
    n = sp.symbols("N", positive=True)
    r1, r2, r3, r4 = sp.symbols("R1 R2 R3 R4", nonnegative=True)
    b1, b2, b3, b4 = sp.symbols("b1 b2 b3 b4", nonnegative=True)
    c1, c2, c3, c4 = sp.symbols("c1 c2 c3 c4", nonnegative=True)
    a1 = n
    a2 = r1 / 4
    a3 = r1 * r2 / (24 * n)
    a4 = r1 * r2 * r3 / (192 * n**2)
    a5 = r1 * r2 * r3 * r4 / (1920 * n**3)
    h = a3**2 - a1 * a5
    ell_b = -a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1
    ell_c = -a1 * c4 + a2 * c3 + a3 * c2 - a4 * c1
    k = -b1 * c3 + 2 * b2 * c2 - b3 * c1
    scaled = sp.factor(5760 * n**2 * (h + ell_b + ell_c + k))
    expected = sp.expand(
        10 * (r1 * r2) ** 2 - 3 * r1 * r2 * r3 * r4
        - 5760 * n**3 * (b4 + c4)
        + 1440 * n**2 * r1 * (b3 + c3)
        + 240 * n * r1 * r2 * (b2 + c2)
        - 30 * r1 * r2 * r3 * (b1 + c1)
        + 5760 * n**2 * k
    )
    assert sp.expand(scaled - expected) == 0
    live = (b2, b3, b4, c2, c3, c4)
    poly = sp.Poly(sp.expand(scaled), *live)
    degrees = {str(variable): poly.degree(variable) for variable in live}
    assert all(degree <= 1 for degree in degrees.values())
    return {
        "occupation_split": "C5=H_C(A)+L_C(A,B)+L_C(A,C)+K_C(B,C)",
        "H_C": "a3^2-a1*a5",
        "L_C": "-a1*b4+a2*b3+a3*b2-a4*b1",
        "K_C": "-b1*c3+2*b2*c2-b3*c1",
        "scaled_identity": str(expected),
        "positive_multiplier": "5760*N^2",
        "multi_affine_degrees": degrees,
        "all_six_live_degrees_at_most_one": True,
        "corner_principle": (
            "A multi-affine polynomial attains its minimum on a rectangular "
            "box at one of its 2^6=64 corners."
        ),
    }


def validate_finite() -> dict:
    report = json.loads(FINITE_REPORT.read_text(encoding="utf-8"))
    assert report["marker"] == FINITE_MARKER
    assert report["orders"] == [2, 14]
    assert report["unlabeled_forests"] == 15204
    assert report["adjacent_mark_cells"] == 165944
    assert report["global_minimum"]["value"] == 0
    assert report["algebra"]["raw_reconstruction_checked_cellwise"] is True
    assert report["completeness"]["known_unlabeled_forest_counts_checked"] is True
    assert report["completeness"]["every_edge_checked"] is True
    assert report["source_sha256"] == sha256(FINITE_SOURCE)
    assert sum(row["unlabeled_forests"] for row in report["rows"].values()) == 15204
    assert sum(row["adjacent_mark_cells"] for row in report["rows"].values()) == 165944
    return {
        "orders_of_G": report["orders"],
        "orders_of_A": [0, 12],
        "unlabeled_forests": report["unlabeled_forests"],
        "adjacent_mark_cells": report["adjacent_mark_cells"],
        "minimum": report["global_minimum"],
        "smallest_positive": report["global_smallest_positive"],
        "ordered_cell_stream_sha256": report["ordered_cell_stream_sha256"],
    }


def validate_cone_report(path: Path, branch: str, expected_degrees: list[int]) -> dict:
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["marker"] == PROBE_MARKER
    assert report["branch"] == branch
    assert report["corner_pairs"] == 64
    assert report["passing_corner_pairs"] == 64
    assert report["failing_corner_pairs"] == 0
    assert report["source_sha256"] == sha256(PROBE_SOURCE)
    records = report["records"]
    assert len(records) == 64
    assert {(row["B_mask"], row["C_mask"]) for row in records} == set(
        itertools.product(range(8), repeat=2)
    )
    digest = hashlib.sha256()
    coefficient_count = 0
    zero_count = 0
    for row in records:
        assert row["negative"] == 0
        assert Fraction(row["minimum"]) >= 0
        assert row["bernstein_degrees"] == expected_degrees
        assert row["bernstein_coefficients"] > 0
        coefficient_count += row["bernstein_coefficients"]
        zero_count += row["zero"]
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
    assert digest.hexdigest().upper() == report["ordered_record_sha256"]
    return {
        "branch": branch,
        "corner_pairs": 64,
        "bernstein_degrees": expected_degrees,
        "bernstein_coefficients": coefficient_count,
        "zero_coefficients": zero_count,
        "minimum": str(min(Fraction(row["minimum"]) for row in records)),
        "ordered_record_sha256": report["ordered_record_sha256"],
        "report_sha256": sha256(path),
    }


def validate_cones() -> list[dict]:
    rows = [validate_cone_report(
        LARGE_REPORT,
        "adjacent marks, ordered mB<=mC, mB,mC>=7",
        [8, 4, 3, 2, 2, 8, 8],
    )]
    for order in range(7):
        rows.append(validate_cone_report(
            SMALL_REPORTS[order],
            f"adjacent marks, mB={order}, mC>=7, |A|>=13",
            [0, 0, 3, 2, 2, 0, 8] if order == 0 else [4, 4, 3, 2, 2, 0, 8],
        ))
    assert sum(row["corner_pairs"] for row in rows) == 512
    assert sum(row["bernstein_coefficients"] for row in rows) == 11529216
    return rows


def validate_hashes() -> dict[str, str]:
    paths = [PROBE_SOURCE, FINITE_SOURCE, FINITE_REPORT, LARGE_REPORT, *SMALL_REPORTS.values()]
    actual = {path.name: sha256(path) for path in paths}
    assert actual == EXPECTED_HASHES
    foundational_actual = {name: sha256(HERE / name) for name in FOUNDATIONAL_HASHES}
    assert foundational_actual == FOUNDATIONAL_HASHES
    return actual | foundational_actual


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--reuse-certificates",
        action="store_true",
        help="validate frozen exact reports without regenerating them",
    )
    args = parser.parse_args()
    if not args.reuse_certificates:
        regenerate_dependencies()

    hashes = validate_hashes()
    algebra = algebra_certificate()
    finite = validate_finite()
    cones = validate_cones()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G with distinct adjacent marked vertices u,v, "
            "C5=[z^4w^4]R(E,U,V,W)-[z^3w^5]R(E,U,V,W) is nonnegative."
        ),
        "algebra_certificate": algebra,
        "geometry_certificate": {
            "definitions": "N=|A|, mB=|B|, mC=|C|, r=mB+mC-N",
            "component_argument": (
                "The neighbors of u and v remaining in A are disjoint. No component "
                "of A contains two such neighbors on one side or neighbors from both "
                "sides, since either event together with uv creates a cycle. Hence A "
                "has at least 2N-mB-mC=N-r components."
            ),
            "edge_budget": "e(A)=N-components(A)<=r",
            "parameter_range": "0<=r<=min(mB,mC)",
            "coefficient_box": (
                "For every m-vertex forest F, binom(m-k+1,k)<=i_k(F)<=binom(m,k)."
            ),
            "path_floor_proof": (
                "Join components to a tree, which can only decrease independent-set "
                "counts, then apply leaf deletion and Pascal induction; P_m attains "
                "the lower bound. The upper bound is the subset ceiling."
            ),
        },
        "ratio_cone_certificate": {
            "normalization": "q_k=2^k*k!*a_k, rho_j=q_(j+1)/q_j",
            "exact_first_ratio": "rho1=2(N-1)-4e(A)/N",
            "forest_drops_for_N_at_least_13": "delta1>=0, delta2>=1, delta3>=1, rho4>=0",
            "simplex_partition": (
                "rho1-2=rho4+(delta3-1)+(delta2-1)+delta1; the four "
                "nonnegative summands are covered by three stick-breaking variables."
            ),
            "order_coverage": (
                "After swapping u,v assume mB<=mC. Either mB=0,...,6, or "
                "mB=7+p and mC=7+p+q with p,q>=0. These are the eight rows below."
            ),
            "compactification": "p=P/(1-P), q=Q/(1-Q), with P,Q in [0,1)",
            "exact_bernstein_branches": cones,
            "branch_count": len(cones),
            "corner_pairs": sum(row["corner_pairs"] for row in cones),
            "bernstein_coefficients": sum(row["bernstein_coefficients"] for row in cones),
            "all_coefficients_nonnegative": True,
        },
        "finite_certificate": finite,
        "coverage_assembly": {
            "finite": "|A|<=12, equivalently |G|<=14",
            "all_order": "|A|>=13",
            "orientation": "C5 and the B,C box are symmetric under swapping u,v",
            "gap": "none within adjacent-mark C5",
        },
        "dependencies_sha256": hashes,
        "replay_mode": "reused frozen reports" if args.reuse_certificates else "regenerated every dependency",
        "scope": (
            "Adjacent-mark C5 only. This does not prove M5+3*C5, no-mark-root g1, "
            "g1 in the other canonical modes, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "finite_adjacent_cells": finite["adjacent_mark_cells"],
        "cone_branches": len(cones),
        "corner_pairs": sum(row["corner_pairs"] for row in cones),
        "bernstein_coefficients": sum(row["bernstein_coefficients"] for row in cones),
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
