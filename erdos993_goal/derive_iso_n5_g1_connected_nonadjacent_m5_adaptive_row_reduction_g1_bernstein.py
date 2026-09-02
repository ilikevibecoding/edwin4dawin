#!/usr/bin/env python3
"""Exact adaptive row reduction for connected-nonadjacent M5.

For an induced subforest B of a forest A, write a_k=i_k(A), b_k=i_k(B),
n=|A| and m=|B|.  Besides b_k<=a_k and b_k<=binom(m,k), the elementary
interpolation

  min(a_k,binom(m,k))
    <= a_k*(binom(n,k)-a_k+binom(m,k))/binom(n,k)

gives a branch-free A-dependent upper bound.  It is sharp on both the
edgeless face and the a_k=binom(m,k) crossing.

Applying this bound at ranks four and five, the path floor at rank three,
and the fixed row partial signs reduces connected-nonadjacent M5 to three
rank-two endpoint forms for each ordered order/geometry/ratio state.  This source
proves the reduction algebraically; it does not assert the endpoint signs.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_exact_g1_bernstein_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ADAPTIVE_ROW_REDUCTION_G1_BERNSTEIN"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def adaptive_upper(ak, n, m, rank):
    ceiling_n = choose(n, rank)
    return sp.factor(ak * (ceiling_n - ak + choose(m, rank)) / ceiling_n)


def hm(a):
    return (
        2*a[1]*a[4] - 2*a[1]*a[5] - 6*a[1]*a[6]
        + 6*a[2]*a[3] - 8*a[2]*a[5] + 2*a[3]**2 + 6*a[3]*a[4]
    )


def lm(a, b):
    return (
        2*a[1]*b[3] - a[1]*b[4] - 6*a[1]*b[5]
        + 4*a[2]*b[2] + a[2]*b[3] - 2*a[2]*b[4]
        + 2*a[3]*b[1] + a[3]*b[2] + 8*a[3]*b[3]
        - a[4]*b[1] - 2*a[4]*b[2] - 6*a[5]*b[1]
    )


def km(b, c):
    return (
        2*b[1]*c[2] - 6*b[1]*c[4]
        + 2*b[2]*c[1] + 4*b[2]*c[3]
        + 4*b[3]*c[2] - 6*b[4]*c[1]
    )


def endpoint_row(a, n, m, eta, exact_small_order=None):
    if exact_small_order is None:
        lower2 = choose(m - 1, 2)
        lower3 = choose(m - 2, 3)
    else:
        assert exact_small_order == int(exact_small_order)
        lower2 = sp.Integer(max(0, int(choose(exact_small_order - 1, 2))))
        lower3 = sp.Integer(max(0, int(choose(exact_small_order - 2, 3))))
    upper2 = choose(m, 2)
    return (
        sp.Integer(1),
        m,
        sp.expand(lower2 + eta * (upper2 - lower2)),
        lower3,
        adaptive_upper(a[4], n, m, 4),
        adaptive_upper(a[5], n, m, 5),
    )


def d_worst_row(a, n, m, empty=False):
    if empty:
        return (sp.Integer(1), sp.Integer(0), sp.Integer(0), sp.Integer(0), sp.Integer(0))
    return (
        sp.Integer(1), m, choose(m - 1, 2), choose(m - 2, 3),
        adaptive_upper(a[4], n, m, 4),
    )


def main() -> None:
    n, m, ak, u = sp.symbols("n m ak u", positive=True)
    cn = choose(n, 4)
    cm = choose(m, 4)
    adaptive = ak * (cn - ak + cm) / cn
    # The two active faces prove min(ak,cm)<=adaptive under
    # 0<=ak<=cn.  Their factorizations are recorded explicitly.
    below_order_ceiling = sp.factor(adaptive - ak)
    above_order_ceiling = sp.factor(adaptive - cm)
    assert sp.cancel(below_order_ceiling - ak*(cm-ak)/cn) == 0
    assert sp.cancel(above_order_ceiling - (ak-cm)*(cn-ak)/cn) == 0

    a = sp.symbols("a0:7", nonnegative=True)
    b = sp.symbols("b0:6", nonnegative=True)
    c = sp.symbols("c0:6", nonnegative=True)
    d = sp.symbols("d0:5", nonnegative=True)
    target = sp.expand(hm(a) + lm(a, b) + lm(a, c) + km(b, c) + km(a, d))
    partials = {
        "B3": sp.factor(sp.diff(target, b[3])),
        "B4": sp.factor(sp.diff(target, b[4])),
        "B5": sp.factor(sp.diff(target, b[5])),
        "C3": sp.factor(sp.diff(target, c[3])),
        "C4": sp.factor(sp.diff(target, c[4])),
        "C5": sp.factor(sp.diff(target, c[5])),
        "D2": sp.factor(sp.diff(target, d[2])),
        "D3": sp.factor(sp.diff(target, d[3])),
        "D4": sp.factor(sp.diff(target, d[4])),
    }
    expected = {
        "B3": 2*a[1]+a[2]+8*a[3]+4*c[2],
        "B4": -a[1]-2*a[2]-6*c[1],
        "B5": -6*a[1],
        "C3": 2*a[1]+a[2]+8*a[3]+4*b[2],
        "C4": -a[1]-2*a[2]-6*b[1],
        "C5": -6*a[1],
        "D2": 2*a[1]+4*a[3],
        "D3": 4*a[2],
        "D4": -6*a[1],
    }
    assert all(sp.expand(partials[key] - value) == 0 for key, value in expected.items())
    assert sp.diff(target, b[2], c[2]) == 0
    assert sp.degree(target, b[2]) == sp.degree(target, c[2]) == 1

    # Reconstruct the endpoint rows symbolically.  After ordering mB<=mC,
    # the B-upper/C-lower corner is redundant: at the rank-three path rows,
    # the B2 slope is at least the C2 slope.
    mb, mc, md = sp.symbols("mB mC mD", nonnegative=True)
    p3b, p3c = choose(mb - 2, 3), choose(mc - 2, 3)
    slope_b = 4*a[2] + a[3] - 2*a[4] + 2*mc + 4*p3c
    slope_c = 4*a[2] + a[3] - 2*a[4] + 2*mb + 4*p3b
    assert sp.expand((slope_b - slope_c) - (2*(mc-mb) + 4*(p3c-p3b))) == 0
    endpoints = {
        "B2_lower_C2_lower": "eta=0,theta=0",
        "B2_lower_C2_upper": "eta=0,theta=1",
        "B2_upper_C2_upper": "eta=1,theta=1",
    }
    # Exercise construction of all three exact rational lower forms without
    # asking SymPy to perform a gratuitous global factorization.
    dr = d_worst_row(a, a[1], md)
    endpoint_forms = []
    for eta, theta in ((0, 0), (0, 1), (1, 1)):
        br = endpoint_row(a, a[1], mb, sp.Integer(eta))
        cr = endpoint_row(a, a[1], mc, sp.Integer(theta))
        endpoint_forms.append(hm(a) + lm(a, br) + lm(a, cr) + km(br, cr) + km(a, dr))
    assert len(endpoint_forms) == 3

    report = {
        "marker": MARKER,
        "theorem": (
            "For every connected-nonadjacent M5 cell with |A|=n>=13 and r>=0, "
            "the exact M5 is bounded below by the minimum of three adaptive "
            "rank-two endpoint forms."
        ),
        "adaptive_upper": {
            "formula": "ak*(binom(n,k)-ak+binom(m,k))/binom(n,k)",
            "validity": (
                "b_k<=min(ak,binom(m,k)); if ak<=binom(m,k), the excess over ak "
                "is ak*(binom(m,k)-ak)/binom(n,k); if ak>=binom(m,k), the "
                "excess over binom(m,k) is (ak-binom(m,k))*(binom(n,k)-ak)/binom(n,k)"
            ),
            "ranks_used": [4, 5],
        },
        "fixed_sign_partials": {key: str(value) for key, value in partials.items()},
        "worst_rows": {
            "B_C": (
            "rank2 at path-floor/subset-ceiling endpoints; rank3 at path floor; "
                "ranks4,5 at adaptive A-dependent upper bounds"
            ),
            "D": (
                "rank2,3 at path floors and rank4 at the adaptive A-dependent upper "
                "bound; the empty D row is split explicitly"
            ),
            "small_order_guard": (
                "When |B| is fixed below 7, exact nonnegative path floors replace "
                "generalized-binomial raw values; all variable-order rows are >=7"
            ),
        },
        "rank_two_endpoint_reason": (
            "The reduced target is separately affine in b2 and c2 and has zero "
            "b2*c2 coefficient. After ordering mB<=mC, the B2 slope exceeds the "
            "C2 slope by 2(mC-mB)+4(P3(mC)-P3(mB))>=0. If the B2 slope is "
            "nonnegative, lower/lower beats upper/lower; if it is negative, then "
            "both slopes are negative and upper/upper beats upper/lower. Hence only "
            "three corners remain."
        ),
        "endpoint_forms": endpoints,
        "geometry_front_end": {
            "relations": "r=mB+mC-n>=0, e(A)<=r+1, mD=r+1 at distance2 and mD=r otherwise",
            "order_split": (
                "after B/C exchange: mB=0,...,6 or mB=7+p,mC=7+p+q"
            ),
            "remaining_ratio_split": (
                "high delta1>=1 and low 0<=delta1<=1 with delta1+delta2>=2; "
                "delta3,delta4>=1"
            ),
        },
        "dependencies_sha256": {
            "derive_iso_n5_g1_connected_nonadjacent_m5_residual_g1_bernstein.py": sha256(
                HERE / "derive_iso_n5_g1_connected_nonadjacent_m5_residual_g1_bernstein.py"
            ),
            "prove_iso_n5_c5_connected_nonadjacent_all_forest_g1_nonadjacent.py": sha256(
                HERE / "prove_iso_n5_c5_connected_nonadjacent_all_forest_g1_nonadjacent.py"
            ),
            "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md": sha256(
                HERE / "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md"
            ),
        },
        "status": "exact endpoint reduction only; signs of the three forms are not asserted",
        "scope": (
            "Connected-nonadjacent M5 adaptive row reduction for r>=0,n>=13 only. "
            "This does not prove the endpoint signs, all connected-nonadjacent M5, "
            "g1, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "endpoint_forms": endpoints,
        "geometry_front_end": report["geometry_front_end"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
