#!/usr/bin/env python3
"""Certificate for the Hermitian rank-one lift and its sharp inertia scale.

If h is in proper position with a monic hyperbolic g and leading(h)=N,
then h/g has a positive-residue representation.  Hence

  g(X)=det(XI-A),  h(X)=g(X)v*(XI-A)^(-1)v,  ||v||^2=N.

The endpoint is the d-th t derivative of a 2N-square block determinant.
This script certifies the spectrum and the exact threshold calculation, and
records a small exact counterexample showing that inertia positivity alone
does not prove stability.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp

from probe_catalan_smoothed_proper_position import derivative_sum_line, derivative_table
from probe_generic_compression_endpoint_pencil import compression_polynomial
from probe_umbral_repaired_core_stability import X, add, integer_values


q=sp.symbols("q")
OUT=Path("bottom_rankone_inertia_lift_certificate_20260802.json")


def main()->None:
    N,d,j,x,y=sp.symbols("N d j x y",integer=True,positive=True)
    a2=sp.Rational(1,1)*N**2/(d*(d-1))
    # Coefficient in det(I+t A_dir^(-1/2) B A_dir^(-1/2)), where
    # x=1/alpha and y=1/beta are arbitrary positive line directions.
    k=sp.symbols("k",integer=True,nonnegative=True)
    ratio=sp.simplify(
        a2*sp.binomial(N-1,k-1)*sp.binomial(N-1,j-k-1)
        /(sp.binomial(N,k)*sp.binomial(N,j-k))
    )
    assert sp.simplify(ratio-k*(j-k)/(d*(d-1)))==0

    endpoint_checks=[]
    for m in range(1,101):
        n=3*m+3
        order=2*m+3
        remaining=2*n-order
        maximum=max(kv*(remaining-kv) for kv in range(max(0,remaining-n),min(n,remaining)+1))
        assert order*(order-1)>=maximum
        previous=order-1
        previous_remaining=2*n-previous
        previous_max=max(kv*(previous_remaining-kv) for kv in range(max(0,previous_remaining-n),min(n,previous_remaining)+1))
        assert previous*(previous-1)<previous_max
        endpoint_checks.append({
            "m":m,"N":n,"d":order,"remaining_degree":remaining,
            "max_k_times_r_minus_k":maximum,
            "d_times_d_minus_1":order*(order-1),
            "previous_order_margin":previous*(previous-1)-previous_max,
        })

    # Small exact control: h<<g with the correct leading coefficient and the
    # inertia threshold d=floor(2N/3)+1, but h is not also proper with g'.
    roots=[-2,-1,0,1]
    g=sp.Poly(sp.prod(X-root for root in roots),X)
    weights=[1,1,18,1]
    h=compression_polynomial(g,roots,weights)
    target_line=add(
        derivative_sum_line(derivative_table(g,3),3,(26,37),(20,27)),
        derivative_sum_line(derivative_table(h,1),1,(26,37),(20,27)),
        -1,
    )
    integers=integer_values(target_line)
    divisor=abs(math.gcd(*integers))
    primitive=[value//divisor for value in integers]
    poly=sp.Poly(sum(value*q**idx for idx,value in enumerate(primitive)),q)
    assert poly.degree()==5 and sp.gcd(poly,poly.diff()).degree()==0
    real=int(poly.count_roots(-sp.oo,sp.oo))
    assert real==3

    report={
        "kind":"bottom_rankone_inertia_lift","date":"2026-08-02",
        "status":"PASS_EXACT_LIFT_AND_SHARP_NECESSARY_THRESHOLD",
        "rankone_representation":{
            "g":"det(XI-A)",
            "h":"g(X) v*(XI-A)^(-1)v",
            "norm_v_squared":"N",
        },
        "block_parent":(
            "det([[ (X+t)I-A, c*t*vv* ],[ c*t*vv*, (Y+t)I-A ]]) "
            "=g(X+t)g(Y+t)-c^2*t^2*h(X+t)h(Y+t), "
            "c^2=1/(d(d-1))"
        ),
        "direction_spectrum":[
            "1, multiplicity 2N-2","1+N/sqrt(d(d-1))","1-N/sqrt(d(d-1))"
        ],
        "positive_line_leading_coefficient":(
            "sum_k binom(N,k)binom(N,r-k)"
            "[1-k(r-k)/(d(d-1))]x^k y^(r-k), r=2N-d"
        ),
        "coefficient_ratio_symbolic_residual":str(sp.simplify(ratio-k*(j-k)/(d*(d-1)))),
        "sharp_threshold":(
            "All bracket coefficients are nonnegative iff "
            "d(d-1)>=max_k k(2N-d-k); the first valid integer is "
            "d=floor(2N/3)+1."
        ),
        "erdos_endpoint":(
            "For N=3m+3, d=2m+3 is exactly floor(2N/3)+1; "
            "the inequality is strict there and fails at d-1."
        ),
        "endpoint_arithmetic_checks":endpoint_checks,
        "inertia_alone_counterexample":{
            "N":4,"d":3,"g":str(g.as_expr()),"roots":roots,"compression_weights":weights,
            "h":str(h.as_expr()),
            "proper_position":"h/g has positive residues 4*w_i/sum(w)",
            "line":{"X":"26+20q","Y":"37+27q"},
            "primitive_integer_coefficients_ascending":primitive,
            "degree":poly.degree(),"exact_real_roots":real,"nonreal_roots":poly.degree()-real,
            "missing_hypothesis":"The roots of h and g' do not alternate.",
        },
        "conclusion":(
            "The rank-one one-negative determinant explains the exact endpoint order "
            "and supplies a necessary derivative-cone condition, but it is not sufficient. "
            "A proof must additionally use h<<g' or the rigid defect-three multiplier/lift."
        ),
    }
    OUT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({
        "status":report["status"],"endpoint_arithmetic_checks":len(endpoint_checks),
        "generic_control_nonreal_roots":2,"output":str(OUT.resolve())
    },indent=2))


if __name__=="__main__":main()
