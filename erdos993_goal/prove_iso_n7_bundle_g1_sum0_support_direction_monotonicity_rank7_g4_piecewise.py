#!/usr/bin/env python3
"""Exact support-direction derivative floors for no-parent common0/sum0 G1."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_support_direction_monotonicity_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SUPPORT_DIRECTION_MONOTONICITY_RANK7_G4_PIECEWISE"
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
    return sp.prod(value - offset for offset in range(rank))/sp.factorial(rank)


def main() -> None:
    assert sha256(SUPPORT_SOURCE) == SUPPORT_SOURCE_SHA256
    assert sha256(SUPPORT_REPORT) == SUPPORT_REPORT_SHA256
    assert json.loads(SUPPORT_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SIGNED_CLUSTER_SUPPORT_LEMMA_RANK7_G4_PIECEWISE"
    )

    m, tail = sp.symbols("m tail", nonnegative=True)
    w = {rank: sp.Symbol(f"W{rank}", nonnegative=True) for rank in range(3, 9)}
    q = sp.expand(
        8*w[3]**2 + 24*w[3]*w[4] - 64*w[3]*w[5]
        - 106*w[3]*w[6] - 51*w[3]*w[7] - 8*w[3]*w[8]
        + 80*w[4]**2 + 90*w[4]*w[5] - 12*w[4]*w[6]
        - 10*w[4]*w[7] + 39*w[5]**2 + 10*w[5]*w[6]
    )
    derivatives = {
        v: sp.factor(sum(
            sp.diff(q, w[rank])*choose_poly(m-v, rank-v)
            for rank in range(v, 9)
        ))
        for v in range(5, 9)
    }
    expected = {
        5: -(
            (8*m**3+9*m**2-191*m+114)*w[3]
            +6*m*(m*5-43)*w[4]
            -12*(5*m+14)*w[5]-60*w[6]
        )/6,
        6: (-4*m**2+m+32)*w[3]+(-10*m+48)*w[4]+10*w[5],
        7: (5-8*m)*w[3]-10*w[4],
        8: -8*w[3],
    }
    assert all(
        sp.expand(derivatives[v]-expected[v]) == 0 for v in range(5, 9)
    )

    # Every independent k-set contains C(k,3) triples, and a fixed triple has
    # at most C(m-3,k-3) extensions.  Use these exact shadow upper bounds only
    # on positive derivative terms; all omitted terms already have negative
    # coefficients for m>=9.
    shadow5 = choose_poly(m-3, 2)/sp.binomial(5, 3)*w[3]
    shadow6 = choose_poly(m-3, 3)/sp.binomial(6, 3)*w[3]
    bound5 = sp.factor(
        sp.diff(derivatives[5], w[3])*w[3]
        +sp.diff(derivatives[5], w[5])*shadow5
        +sp.diff(derivatives[5], w[6])*shadow6
    )
    bound6 = sp.factor(
        sp.diff(derivatives[6], w[3])*w[3]
        +sp.diff(derivatives[6], w[5])*shadow5
    )
    assert sp.expand(bound5 + (
        15*m**3+92*m**2-639*m+144
    )*w[3]/20) == 0
    assert sp.expand(bound6 + (7*m**2+5*m-76)*w[3]/2) == 0
    positive5 = sp.factor(-bound5/w[3]).subs(m, tail+9)
    positive6 = sp.factor(-bound6/w[3]).subs(m, tail+9)
    assert all(coefficient > 0 for coefficient in sp.Poly(positive5, tail).all_coeffs())
    assert all(coefficient > 0 for coefficient in sp.Poly(positive6, tail).all_coeffs())
    assert sp.Poly(positive5, tail).all_coeffs() == [
        sp.Rational(3, 4), sp.Rational(497, 20), sp.Rational(2331, 10), sp.Integer(639)
    ]
    assert sp.Poly(positive6, tail).all_coeffs() == [
        sp.Rational(7, 2), sp.Rational(131, 2), sp.Integer(268)
    ]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every m-vertex graph with independence rows W3,...,W8 and "
            "m>=9, the no-parent common0/sum0 G1 directional derivatives "
            "along each signed-support basis vector B_v,k=C(m-v,k-v), "
            "v=5,6,7,8, are nonpositive."
        ),
        "directions": {
            str(v): str(derivatives[v]) for v in range(5, 9)
        },
        "shadow_bounds": {
            "general": (
                "C(k,3)W_k<=C(m-3,k-3)W3, by independent-set extension "
                "double counting"
            ),
            "direction5_upper": str(bound5),
            "direction6_upper": str(bound6),
            "direction7": str(derivatives[7]),
            "direction8": str(derivatives[8]),
        },
        "threshold": "m>=9",
        "consequence": (
            "At an actual independence row, positive E5,E6,E7,E8 support "
            "mass is locally harmful to G1 and negative mass is locally "
            "helpful. Coupled finite moves still require their exact "
            "quadratic/overlap audit."
        ),
        "coverage_gap_within_stated_directional_derivative_scope": None,
        "scope": (
            "A derivative lemma only; it does not license independent endpoint "
            "replacement of all support variables and is not a G1 closure."
        ),
        "dependencies_sha256": {
            SUPPORT_SOURCE.name: SUPPORT_SOURCE_SHA256,
            SUPPORT_REPORT.name: SUPPORT_REPORT_SHA256,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "directions": [5, 6, 7, 8],
        "threshold_m": 9,
        "coverage_gap_within_stated_directional_derivative_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
