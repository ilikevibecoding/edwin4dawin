#!/usr/bin/env python3
"""Exact densest-bin seam for a path plus isolates, no-parent G1.

Let W=P_h+rK1.  Its edge density is strictly above 9/10 exactly when
h>=9r+11.  After substituting h=9r+11+t, the literal common0/sum0 no-parent
G1 coefficient has only nonnegative rational coefficients in r and t.  This
pins the path-like extremal seam suggested by the signed-support correction;
it does not assert that every forest in the dense edge bin reduces to a path.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_edge_path_isolates_no_parent_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_EDGE_PATH_ISOLATES_NO_PARENT_RANK7_G4_PIECEWISE"
SUPPORT_SOURCE = HERE / "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py"
SUPPORT_REPORT = HERE / "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json"
SUPPORT_SOURCE_SHA256 = "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846"
SUPPORT_REPORT_SHA256 = "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def main() -> None:
    assert sha256(SUPPORT_SOURCE) == SUPPORT_SOURCE_SHA256
    assert sha256(SUPPORT_REPORT) == SUPPORT_REPORT_SHA256
    support = json.loads(SUPPORT_REPORT.read_text(encoding="utf-8"))
    assert support["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SIGNED_CLUSTER_SUPPORT_LEMMA_RANK7_G4_PIECEWISE"
    )

    h, r, tail = sp.symbols("h r tail", nonnegative=True, integer=True)
    rows = {
        rank: sp.expand(sum(
            choose_poly(r, rank - path_rank)
            * choose_poly(h - path_rank + 1, path_rank)
            for path_rank in range(rank + 1)
        ))
        for rank in range(3, 9)
    }
    w3, w4, w5, w6, w7, w8 = (rows[rank] for rank in range(3, 9))
    value = sp.expand(
        8*w3**2 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4**2 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5**2 + 10*w5*w6
    )

    # W has m=h+r vertices and e=h-1 edges.  The strict dense-bin condition
    # 10e>9m is h>9r+10, hence h=9r+11+tail for integral h,r.
    shifted = sp.expand(value.subs(h, 9*r + 11 + tail))
    polynomial = sp.Poly(shifted, r, tail)
    terms = polynomial.terms()
    assert polynomial.degree_list() == (10, 10)
    assert len(terms) == 66
    assert all(coefficient > 0 for _, coefficient in terms)
    minimum = min(coefficient for _, coefficient in terms)
    assert minimum == sp.Rational(143, 100800)
    stream = hashlib.sha256()
    for monomial, coefficient in terms:
        stream.update(f"{monomial}|{sp.srepr(coefficient)}\n".encode())
    stream_hash = stream.hexdigest().upper()
    assert stream_hash == "B4621E49750D6F2C86FC7486382FB8F8E54CB08A293A7757763ADCFD787F6324"

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W=P_h plus r isolated vertices, with h>=9r+11. If C is "
            "obtained by adjoining two isolated marked vertices and D=C "
            "(no-parent mode), then the exact rank-seven common0/sum0 bundle "
            "coefficient G1 is nonnegative."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "family": "W=P_h+rK1",
        "dense_bin_equivalence": (
            "e(W)/|W|>9/10 iff (h-1)/(h+r)>9/10 iff h>=9r+11"
        ),
        "path_rows": (
            "i_k(W)=sum_j C(r,k-j)C(h-j+1,j), using "
            "i_j(P_h)=C(h-j+1,j)"
        ),
        "shift": "h=9r+11+tail",
        "certificate": {
            "variables": ["r", "tail"],
            "degree_profile": [10, 10],
            "nonzero_power_coefficients": len(terms),
            "negative_power_coefficients": 0,
            "minimum_power_coefficient": str(minimum),
            "ordered_power_stream_sha256": stream_hash,
        },
        "coverage_gap_within_stated_path_isolate_dense_bin_family": None,
        "scope": (
            "Rank-seven G1, common0/sum0, no-parent, and only the family "
            "P_h+rK1 in the strict edge-density-above-9/10 bin. This does "
            "not prove an extremal reduction from arbitrary forests to this "
            "family and does not close the whole dense edge bin."
        ),
        "dependencies_sha256": {
            SUPPORT_SOURCE.name: SUPPORT_SOURCE_SHA256,
            SUPPORT_REPORT.name: SUPPORT_REPORT_SHA256,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "degree_profile": report["certificate"]["degree_profile"],
        "negative_power_coefficients": 0,
        "minimum_power_coefficient": str(minimum),
        "coverage_gap_within_stated_path_isolate_dense_bin_family": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
