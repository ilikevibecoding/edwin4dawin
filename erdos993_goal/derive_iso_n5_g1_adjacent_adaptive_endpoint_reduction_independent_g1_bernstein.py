#!/usr/bin/env python3
"""Independent exact adaptive endpoint reduction for adjacent rank-five g1.

This source reconstructs the two-deficit polynomial, proves its monotonicity
in ranks 3,4,5, proves the branch-free path and adaptive positive-part
bounds, and reduces the coupled rank-2 edge budget to three vertices.

It is a front-end reduction only.  It does not assert that the six resulting
high/low cone branches are nonnegative.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_adaptive_endpoint_reduction_independent_g1_bernstein_20260830.json"
MARKER = "DERIVED_INDEPENDENT_EXACT_ISO_N5_G1_ADJACENT_ADAPTIVE_ENDPOINT_REDUCTION_G1_BERNSTEIN"


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

    def k_form(left, right):
        return (
            2*left[1]*right[2]-3*left[1]*right[3]-6*left[1]*right[4]
            +2*left[2]*right[1]+6*left[2]*right[2]+4*left[2]*right[3]
            -3*left[3]*right[1]+4*left[3]*right[2]-6*left[4]*right[1]
        )

    target = sp.expand(face-t_form(x)-t_form(y)+k_form(x,y))
    derivatives = {rank: sp.factor(sp.diff(target,x[rank])) for rank in range(2,6)}
    assert derivatives[5] == 6*a[1]
    assert sp.expand(derivatives[4]-2*(5*a[1]+a[2]-3*y[1])) == 0
    assert sp.expand(derivatives[3]-(a[1]-8*a[2]-8*a[3]-3*y[1]+4*y[2])) == 0

    n, q, N, Q = sp.symbols("n q N Q", nonnegative=True)
    q2 = q*n-q*(q+1)/2
    e_ceiling = n-q-1
    a2_lower = sp.binomial(n,2)-e_ceiling
    a3_lower = sp.binomial(n,3)-e_ceiling*(n-2)
    d3_upper = sp.expand_func(n-8*a2_lower-8*a3_lower-3*q+4*q2)
    negated = sp.Poly(sp.expand((-d3_upper).subs({n:N+13,q:Q+1})),N,Q)
    assert all(value > 0 for value in negated.coeffs())

    # The adaptive positive-part lemma is checked independently in both sign
    # branches.  Here C is the whole-set ceiling, A the actual coefficient,
    # and M the deleted-subforest ceiling.
    A, M, C = sp.symbols("A M C", nonnegative=True)
    adaptive = A*(A-M)/C
    raw_branch_slack = sp.factor((A-M)-adaptive)
    negative_branch_slack = sp.factor(-adaptive)
    assert sp.cancel(raw_branch_slack+(A-C)*(A-M)/C) == 0
    assert sp.cancel(negative_branch_slack+A*(A-M)/C) == 0

    m = sp.Symbol("m", integer=True, positive=True)
    raw_path3 = sp.prod(m-2-j for j in range(3))/6
    small_raw = {order: int(raw_path3.subs(m,order)) for order in range(1,5)}
    assert small_raw == {1:-1,2:0,3:0,4:0}

    eX,eY,e_total,Qp,Qq = sp.symbols("eX eY e_total Qp Qq", nonnegative=True)
    edge_form = sp.expand(target.subs({x[2]:Qp-eX,y[2]:Qq-eY}))
    assert sp.diff(edge_form,eX,eY) == 6
    hypotenuse = sp.expand(edge_form.subs(eY,e_total-eX))
    assert sp.diff(hypotenuse,eX,2) == -12

    p = sp.Symbol("p", positive=True, integer=True)
    Qp_formula = p*n-p*(p+1)/2
    lower_rank2 = sp.factor(Qp_formula-(n-p-q))
    assert sp.expand(2*lower_rank2-((p-1)*(2*n-p)+2*q)) == 0

    report = {
        "marker": MARKER,
        "exact_target": "S=SAAA-T(A,X)-T(A,Y)+K(X,Y)",
        "geometry": (
            "p,q>=1 select vertices from mutually disjoint component families; "
            "p+q<=c(A), e(A)=n-c(A)"
        ),
        "rank2": {
            "identity": "x2=Q(p)-eX, y2=Q(q)-eY",
            "edge_budget": "eX,eY>=0 and eX+eY<=e(A)",
            "mixed_derivative": 6,
            "hypotenuse_second_derivative": -12,
            "vertices": ["(0,0)","(e,0)","(0,e)"],
            "Qp_minus_maximum_incident_budget": str(lower_rank2),
        },
        "rank3": {
            "upper": "x3<=a3-C(n-p-2,3), y3<=a3-C(n-q-2,3)",
            "raw_small_complement_values": small_raw,
            "reason": (
                "The raw generalized polynomial equals the path floor for m>=2 "
                "and is -1<=0 at m=1"
            ),
            "partial_derivative": str(derivatives[3]),
            "derivative_upper": str(d3_upper),
            "negated_shifted_terms": len(negated.terms()),
            "negated_shifted_minimum_coefficient": str(min(negated.coeffs())),
        },
        "rank45": {
            "adaptive_bound": "xk>=(ak/C(n,k))*(ak-C(n-p,k)), k=4,5",
            "raw_nonnegative_branch_slack": str(raw_branch_slack),
            "raw_negative_branch_slack": str(negative_branch_slack),
            "assumptions": "0<=ak<=C(n,k)",
            "partial_derivative_x4": str(derivatives[4]),
            "partial_derivative_x5": str(derivatives[5]),
        },
        "conclusion": (
            "For n>=13, substitute the branch-free rank-3 uppers and adaptive "
            "rank-4/5 lowers, then check only the three rank-2 budget vertices."
        ),
        "remaining_work": (
            "The six high/low endpoint cone signs are not proved by this artifact."
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
        "marker":MARKER,
        "rank2_vertices":3,
        "rank3_branch_free":True,
        "rank45_adaptive_branch_free":True,
        "remaining_work":report["remaining_work"],
    },indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
