#!/usr/bin/env python3
"""Exact endpoint-direction audit for the nonadjacent shared-A-p lower.

This file certifies that the total 133-term ordinary-parent lower, not merely
the parent-loss correction, is minimized at the PATH endpoints for B3,B4,C3,C4
and at the EDGELESS endpoints for B5,B6,C5,C6.  Consequently rank 2 is the
only free endpoint in each of B and C, giving the advertised four corners.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
LOSS = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
LOSS_SHA256 = "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6"
NO_PARENT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
NO_PARENT_SHA256 = "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83"
REDUCTION = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_safe_cap_exact_rank7_g5_finish_20260831.json"
REDUCTION_SHA256 = "DDCF16EA392A2D351028EB0282DD4001BD649E26B58A89848A3DF3BF049CE2AD"
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_four_corner_signs_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_FOUR_CORNER_SIGNS_RANK7_G5_FINISH"
LOWER_SHA256 = "E27665FFF4F0766F63D345EA2B8041BF4CA13CF9F3F9A846FD7C6C296FD6689C"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def path_floor(value, rank):
    return choose(value - rank + 1, rank)


def reconstruct_lower():
    loss = json.loads(LOSS.read_text(encoding="utf-8"))
    no_parent_report = json.loads(NO_PARENT.read_text(encoding="utf-8"))
    reduction = json.loads(REDUCTION.read_text(encoding="utf-8"))
    assert loss["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PARENT_LOSS_ROOT"
    assert reduction["ordinary_lower_sha256"] == LOWER_SHA256

    a = sp.symbols("a0:8", nonnegative=True)
    b = sp.symbols("b0:7", nonnegative=True)
    c = sp.symbols("c0:7", nonnegative=True)
    d = sp.symbols("d0:7", nonnegative=True)
    PA = {rank: sp.Symbol(f"PA{rank}", nonnegative=True) for rank in range(3, 7)}
    PB = {rank: sp.Symbol(f"PB{rank}", nonnegative=True) for rank in range(3, 7)}
    PW = {rank: sp.Symbol(f"PW{rank}", nonnegative=True) for rank in range(2, 7)}
    PZ = {rank: sp.Symbol(f"PZ{rank}", nonnegative=True) for rank in range(4, 7)}
    local = {
        str(symbol): symbol
        for symbol in (*a, *b, *c, *d, *PA.values(), *PB.values(), *PW.values(), *PZ.values())
    }
    correction = sp.sympify(
        loss["adjacency_masks"]["u0_v0"]["correction"], locals=local
    )
    coefficients = {
        str(symbol): sp.expand(sp.diff(correction, symbol))
        for symbol in (*PA.values(), *PB.values(), *PW.values(), *PZ.values())
    }
    no_parent_local = {str(symbol): symbol for symbol in (*a, *b, *c, *d)}
    no_parent = sp.expand(
        sum(
            sp.sympify(no_parent_report["pieces"][label], locals=no_parent_local)
            for label in ("A2", "L2_AB", "L2_AC", "K2_BC", "J2_AD")
        )
    )
    n, mb, mc, delta = a[1], b[1], c[1], d[1]
    negative_pw3 = (
        4 * a[2] + 2 * a[3]
        + 2 * mb + 2 * b[2] + 5 * b[3]
        + 2 * mc + 2 * c[2] + 5 * c[3]
        + 12 * d[2]
    )
    lower = sp.expand(
        no_parent
        + coefficients["PA4"] * choose(mb - 1, 2)
        + coefficients["PA5"] * choose(mb - 1, 3)
        + coefficients["PB4"] * choose(mc - 1, 2)
        + coefficients["PB5"] * choose(mc - 1, 3)
        - negative_pw3 * choose(n - 1, 2)
        + coefficients["PW4"] * choose(n - 1, 3)
        + coefficients["PZ5"] * choose(delta - 1, 2)
    )
    assert hashlib.sha256(str(lower).encode()).hexdigest().upper() == LOWER_SHA256
    assert len(sp.Poly(lower, *sorted(lower.free_symbols, key=str)).terms()) == 133
    return lower, a, b, c, d


def main():
    assert sha256(LOSS) == LOSS_SHA256
    assert sha256(NO_PARENT) == NO_PARENT_SHA256
    assert sha256(REDUCTION) == REDUCTION_SHA256
    lower, a, b, c, _d = reconstruct_lower()
    n, mb, mc = a[1], b[1], c[1]

    expected = {
        "B3": (-5*n**2 + 23*n + 18*a[2] + 48*a[3] + 16*a[4]
               + 2*mc + 22*c[2] + 20*c[3] - 10) / 2,
        "B4": -n - 4*a[2] + 8*a[3] - 15*mc - 2*c[2],
        "B5": -16*n - 9*a[2] - 7*mc,
        "B6": -7*n,
        "C3": (-5*n**2 + 23*n + 18*a[2] + 48*a[3] + 16*a[4]
               + 2*mb + 22*b[2] + 20*b[3] - 10) / 2,
        "C4": -n - 4*a[2] + 8*a[3] - 15*mb - 2*b[2],
        "C5": -16*n - 9*a[2] - 7*mb,
        "C6": -7*n,
    }
    coordinates = {
        "B3": b[3], "B4": b[4], "B5": b[5], "B6": b[6],
        "C3": c[3], "C4": c[4], "C5": c[5], "C6": c[6],
    }
    exact_derivatives = {}
    for label, coordinate in coordinates.items():
        derivative = sp.expand(sp.diff(lower, coordinate))
        assert sp.expand(derivative - expected[label]) == 0, label
        exact_derivatives[label] = str(sp.factor(derivative))

    # Uniform lower floors over the full forest row box.  For rank 3 use
    # a_k >= P(N,k), and discard the remaining nonnegative B/C terms.
    floor3 = sp.expand(
        (-5*n**2 + 23*n
         + 18*path_floor(n, 2)
         + 48*path_floor(n, 3)
         + 16*path_floor(n, 4) - 10) / 2
    )
    assert sp.expand(
        floor3 - (n**4 - 6*n**3 + 17*n**2 - 36*n + 84) / 3
    ) == 0

    # For rank 4 use a2<=C(N,2), a3>=P(N,3), m<=N and
    # i2(row)<=C(m,2)<=C(N,2).
    floor4 = sp.expand(8*path_floor(n, 3) - 6*choose(n, 2) - 16*n)
    assert sp.expand(
        floor4 - (4*n**3 - 45*n**2 + 65*n - 96) / 3
    ) == 0

    t = sp.Symbol("t", nonnegative=True)
    floor3_shift = sp.Poly(sp.expand(floor3.subs(n, t + 12)), t)
    floor4_shift = sp.Poly(sp.expand(floor4.subs(n, t + 12)), t)
    assert all(coefficient > 0 for coefficient in floor3_shift.all_coeffs())
    assert all(coefficient > 0 for coefficient in floor4_shift.all_coeffs())

    # Rank 5 and rank 6 derivatives are strictly negative for N>=1.
    assert expected["B5"] == -16*n - 9*a[2] - 7*mc
    assert expected["B6"] == -7*n
    assert expected["C5"] == -16*n - 9*a[2] - 7*mb
    assert expected["C6"] == -7*n

    report = {
        "marker": MARKER,
        "status": "PASS exact total-lower endpoint-direction reduction",
        "scope": "nonadjacent marks; ordinary p adjacent to neither; total 133-term shared-A-p lower; N>=12",
        "ordinary_lower_sha256": LOWER_SHA256,
        "lower_terms": 133,
        "exact_total_lower_derivatives": exact_derivatives,
        "forest_row_box": {
            "lower": "P(m,k)=C(m-k+1,k) <= i_k(F)",
            "upper": "i_k(F) <= C(m,k)",
            "orders": "0<=mB,mC<=N",
        },
        "positive_rank3_floor": {
            "expression": str(sp.factor(floor3)),
            "N12_shift": str(floor3_shift.as_expr()),
            "power_coefficients": [str(value) for value in floor3_shift.all_coeffs()],
        },
        "positive_rank4_floor": {
            "expression": str(sp.factor(floor4)),
            "N12_shift": str(floor4_shift.as_expr()),
            "power_coefficients": [str(value) for value in floor4_shift.all_coeffs()],
        },
        "directions": {
            "B3_B4_C3_C4": "strictly positive derivative: minimum at PATH endpoint",
            "B5_B6_C5_C6": "strictly negative derivative: minimum at EDGELESS endpoint",
            "B2_C2": "not reduced: retain both endpoints independently",
        },
        "conclusion": "The total lower is minimized over the B,C row boxes by exactly four corners, indexed only by B2 and C2.",
        "pins": {
            "loss": {"file": LOSS.name, "sha256": LOSS_SHA256},
            "no_parent": {"file": NO_PARENT.name, "sha256": NO_PARENT_SHA256},
            "shared_ap_reduction": {"file": REDUCTION.name, "sha256": REDUCTION_SHA256},
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "rank3_floor_N12": str(floor3.subs(n, 12)),
        "rank4_floor_N12": str(floor4.subs(n, 12)),
        "directions": report["directions"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
