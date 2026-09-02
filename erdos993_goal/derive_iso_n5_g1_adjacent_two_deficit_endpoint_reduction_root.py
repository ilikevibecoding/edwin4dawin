#!/usr/bin/env python3
"""Exact endpoint reduction for adjacent g1 with two positive deficits.

Let A be an n-vertex forest and let D_X,D_Y select one vertex from mutually
disjoint components, with positive sizes p,q.  Put X=I(A)-I(A-D_X) and
Y=I(A)-I(A-D_Y).  This artifact proves that for n>=13 the exact target

  S=S(A,A,A)-T(A,X)-T(A,Y)+K(X,Y)

is minimized by explicit upper/lower replacements in ranks 3,4,5 and then
at one of three coupled rank-2 corners.  It is a reduction only: the final
endpoint signs are not asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_two_deficit_endpoint_reduction_exact_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_ENDPOINT_REDUCTION_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    a = sp.symbols("a0:7", nonnegative=True)
    x = (sp.Integer(0), *sp.symbols("x1:6", nonnegative=True))
    y = (sp.Integer(0), *sp.symbols("y1:6", nonnegative=True))

    face = (
        4*a[1]*a[2]+2*a[1]*a[3]-26*a[1]*a[4]-29*a[1]*a[5]
        -6*a[1]*a[6]+14*a[2]**2+30*a[2]*a[3]-8*a[2]*a[4]
        -8*a[2]*a[5]+21*a[3]**2+6*a[3]*a[4]
    )

    def t_form(z):
        return (
            (2*a[2]-a[3]-10*a[4]-6*a[5])*z[1]
            +2*(a[1]+5*a[2]+4*a[3]-a[4])*z[2]
            +(-a[1]+8*a[2]+8*a[3])*z[3]
            -2*(5*a[1]+a[2])*z[4]-6*a[1]*z[5]
        )

    def k_form(left,right):
        return (
            2*left[1]*right[2]-3*left[1]*right[3]-6*left[1]*right[4]
            +2*left[2]*right[1]+6*left[2]*right[2]+4*left[2]*right[3]
            -3*left[3]*right[1]+4*left[3]*right[2]-6*left[4]*right[1]
        )

    target = sp.expand(face-t_form(x)-t_form(y)+k_form(x,y))
    derivatives = {rank: sp.factor(sp.diff(target,x[rank])) for rank in range(2,6)}
    assert sp.expand(derivatives[5]-6*a[1]) == 0
    assert sp.expand(derivatives[4]-2*(5*a[1]+a[2]-3*y[1])) == 0
    assert sp.expand(derivatives[3]-(a[1]-8*a[2]-8*a[3]-3*y[1]+4*y[2])) == 0
    assert sp.diff(target,x[2],y[2]) == 6
    assert sp.degree(target,x[2]) == sp.degree(target,y[2]) == 1
    eX,eY,e_total,Qp,Qq = sp.symbols("eX eY e_total Qp Qq", nonnegative=True)
    edge_form = sp.expand(target.subs({x[2]:Qp-eX,y[2]:Qq-eY}))
    assert sp.diff(edge_form,eX,eY) == 6
    hypotenuse = sp.expand(edge_form.subs(eY,e_total-eX))
    assert sp.diff(hypotenuse,eX,2) == -12

    n, q, N, Q = sp.symbols("n q N Q", nonnegative=True)
    q2 = q*n-q*(q+1)/2
    # For the x3 derivative, use y2<=Q(q), e<=n-q-1,
    # a2=C(n,2)-e, and a3=C(n,3)-e(n-2)+W with W>=0.
    edge_ceiling = n-q-1
    a2_floor = sp.binomial(n,2)-edge_ceiling
    a3_floor = sp.binomial(n,3)-edge_ceiling*(n-2)
    derivative3_ceiling = sp.expand_func(n-8*a2_floor-8*a3_floor-3*q+4*q2)
    expected = -(
        4*n**3-24*n**2+12*n*q+41*n+6*q**2-9*q-24
    )/3
    assert sp.expand(derivative3_ceiling-expected) == 0
    positivity = sp.Poly(sp.expand((-expected).subs({n:N+13,q:Q+1})),N,Q)
    assert all(coefficient > 0 for coefficient in positivity.coeffs())

    p, e = sp.symbols("p e", integer=True, positive=True)
    qp = sp.expand(p*n-p*(p+1)/2)
    lower_nonnegative = sp.factor(qp-(n-p-q))
    expected_lower = (2*n*p-2*n-p**2+p+2*q)/2
    assert sp.expand(lower_nonnegative-expected_lower) == 0

    report = {
        "marker": MARKER,
        "geometry": {
            "sizes": "p=|D_X|>=1, q=|D_Y|>=1, p+q<=c(A), e(A)=n-c(A)",
            "disjointness": (
                "D_X and D_Y contain at most one vertex from each component and use "
                "disjoint component families"
            ),
        },
        "rank2_exact_region": {
            "identity": "x2=Q(p)-e_X, Q(p)=p*n-p*(p+1)/2",
            "reason": (
                "D_X is independent, and e_X is the number of A-edges incident "
                "with D_X; 0<=e_X<=e(A)"
            ),
            "coupled_edge_budget": "e_X>=0, e_Y>=0, e_X+e_Y<=e(A)",
            "x_interval": "Q(p)-e(A)<=x2<=Q(p)",
            "lower_endpoint_nonnegative": str(lower_nonnegative),
            "y_interval": "Q(q)-e(A)<=y2<=Q(q)",
            "three_vertices": [
                "(x2,y2)=(Q(p),Q(q))",
                "(x2,y2)=(Q(p)-e(A),Q(q))",
                "(x2,y2)=(Q(p),Q(q)-e(A))",
            ],
        },
        "rank3_upper": {
            "x3": "a3-P3(n-p), where P3(m)=max(0,C(m-2,3))",
            "y3": "a3-P3(n-q), where P3(m)=max(0,C(m-2,3))",
            "reason": (
                "B=A-D_X and C=A-D_Y are forests of orders n-p,n-q, and the "
                "rank-3 path floor gives b3>=P3(n-p), c3>=P3(n-q)"
            ),
            "branch_free_raw_option": (
                "The generalized polynomial C(m-2,3) is <=P3(m) for every integer "
                "m>=1, so x3<=a3-C(n-p-2,3) is a valid branch-free weakening."
            ),
        },
        "rank45_lower": {
            "x4": "max(0,a4-C(n-p,4))",
            "x5": "max(0,a5-C(n-p,5))",
            "y4": "max(0,a4-C(n-q,4))",
            "y5": "max(0,a5-C(n-q,5))",
            "reason": "the deletion subforest has n-p or n-q vertices",
        },
        "exact_partial_derivatives": {f"x{rank}": str(value) for rank,value in derivatives.items()},
        "monotonicity_for_n_at_least_13": {
            "x5_y5": "strictly increasing",
            "x4_y4": "strictly increasing because q,p<=n-1",
            "x3_y3": (
                "strictly decreasing; the displayed derivative ceiling has negative "
                "of a polynomial with positive coefficients after n=N+13,q=Q+1"
            ),
            "x3_derivative_ceiling": str(expected),
            "positive_negated_ceiling_terms": len(positivity.terms()),
            "positive_negated_ceiling_minimum_coefficient": str(min(positivity.coeffs())),
        },
        "endpoint_conclusion": (
            "After the rank-3 upper and rank-4/5 lower substitutions, write "
            "x2=Q(p)-e_X and y2=Q(q)-e_Y. The only mixed term in (e_X,e_Y) "
            "has coefficient +6. For fixed e_X the expression is linear in e_Y; "
            "on e_Y=e-e_X it is concave. Hence its minimum on the edge-budget "
            "triangle is attained at one of the three displayed vertices."
        ),
        "remaining_work": (
            "Apply the adaptive rank-4/5 floors and certify the three coupled rank-2 "
            "endpoint signs in the high and low ratio sectors; "
            "this artifact does not assert those signs."
        ),
        "dependencies_sha256": {
            "derive_iso_n5_g1_adjacent_deletion_deficit_form_root.py": sha256(
                HERE/"derive_iso_n5_g1_adjacent_deletion_deficit_form_root.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(raw,encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "rank2_corners": 3,
        "rank3_derivative_ceiling": str(expected),
        "rank45_floors_retained": True,
        "remaining_work": report["remaining_work"],
    },indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
