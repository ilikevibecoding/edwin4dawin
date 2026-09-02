#!/usr/bin/env python3
"""Exact cone probe for the tightened adjacent two-deficit endpoint route.

This combines three proved reductions:
  * the coupled incident-edge triangle has only three relevant vertices;
  * x3,y3 use the forest path lower floor of the deletion subforest;
  * x4,x5,y4,y5 use the branch-free adaptive positive-part floors.

The p,q,component-slack,edge simplex is covered by stick-breaking variables.
The high/low forest factorial-drop cones are then converted to exact tensor
Bernstein coefficients.  Each invocation checks one sector and one of the
three coupled rank-2 vertices.  This remains a probe until every branch is
assembled and independently audited.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_ADAPTIVE_COUPLED_CONE_ROOT"


def abstract_scaled(endpoint: str):
    n,p,q,e,R1,R2,R3,R4,R5 = sp.symbols("n p q e R1 R2 R3 R4 R5")
    variables = (n,p,q,e,R1,R2,R3,R4,R5)
    a = (
        sp.Integer(1), n, R1/4, R1*R2/(24*n),
        R1*R2*R3/(192*n**2),
        R1*R2*R3*R4/(1920*n**3),
        R1*R2*R3*R4*R5/(23040*n**4),
    )

    def choose_poly(value, rank):
        return sp.prod(value-offset for offset in range(rank))/sp.factorial(rank)

    def q2(d):
        return d*n-d*(d+1)/2

    incident_x = e if endpoint == "x" else 0
    incident_y = e if endpoint == "y" else 0

    def deficit_row(d,incident):
        x2 = q2(d)-incident
        # The raw generalized path polynomial is <= the nonnegative path
        # floor for every integer residual order >=1, hence is a valid
        # branch-free weakening.
        x3 = a[3]-choose_poly(n-d-2,3)
        c4 = choose_poly(n,4)
        c5 = choose_poly(n,5)
        x4 = a[4]*(a[4]-choose_poly(n-d,4))/c4
        x5 = a[5]*(a[5]-choose_poly(n-d,5))/c5
        return (sp.Integer(0),d,x2,x3,x4,x5)

    x = deficit_row(p,incident_x)
    y = deficit_row(q,incident_y)
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

    c4 = choose_poly(n,4)
    c5 = choose_poly(n,5)
    scaled = sp.cancel(46080*n**5*c4*c5*(face-t_form(x)-t_form(y)+k_form(x,y)))
    numerator,denominator = sp.fraction(scaled)
    polynomial = sp.Poly(sp.expand(numerator),*variables,domain=sp.QQ)
    scalar_denominator = sp.Poly(denominator,*variables,domain=sp.QQ)
    assert scalar_denominator.total_degree() == 0
    denominator_value = scalar_denominator.TC()
    polynomial = sp.Poly(polynomial.as_expr()/denominator_value,*variables,domain=sp.QQ)
    return variables,polynomial


def mapped_geometry(sector: str):
    names = (
        ("u","v","w","r0","r1","r2","r3","N")
        if sector == "high" else
        ("u","v","w","delta1","r0","r1","r2","N")
    )
    context = fmpq_mpoly_ctx.get(names,"degrevlex")
    gens = context.gens()
    one = context.constant(1)
    u,v,w = gens[:3]
    N = gens[-1]
    n = N+13
    total = n-2
    p = 1+total*u
    q = 1+total*(1-u)*v
    edge = total*(1-u)*(1-v)*(1-w)
    R1 = 2*n*(n-1)-4*edge
    budget = R1-4*n
    if sector == "high":
        r0,r1,r2,r3 = gens[3:7]
        R5 = budget*r0
        D4 = budget*(1-r0)*r1
        D3 = budget*(1-r0)*(1-r1)*r2
        D2 = budget*(1-r0)*(1-r1)*(1-r2)*r3
        R4 = R5+n+D4
        R3 = R4+n+D3
        R2 = R3+n+D2
        assert R1 == R2+n+budget*(1-r0)*(1-r1)*(1-r2)*(1-r3)
    else:
        delta1,r0,r1,r2 = gens[3:7]
        R5 = budget*r0
        D4 = budget*(1-r0)*r1
        D3 = budget*(1-r0)*(1-r1)*r2
        D2 = budget*(1-r0)*(1-r1)*(1-r2)
        R4 = R5+n+D4
        R3 = R4+n+D3
        R2 = R3+2*n-n*delta1+D2
        assert R1 == R2+n*delta1
    return context,(n,p,q,edge,R1,R2,R3,R4,R5)


def evaluate_abstract(polynomial,mapped,context):
    degrees = [polynomial.degree(index) for index in range(len(mapped))]
    powers = [[context.constant(1)] for _ in mapped]
    for axis,value in enumerate(mapped):
        for exponent in range(1,degrees[axis]+1):
            powers[axis].append(powers[axis][-1]*value)

    def terms():
        for monomial,coefficient in polynomial.terms():
            numerator,denominator = map(int,sp.fraction(coefficient))
            term = context.constant(fmpq(numerator,denominator))
            for axis,exponent in enumerate(monomial):
                term *= powers[axis][exponent]
            yield term

    return balanced_batched_sum(terms(),batch_size=64),degrees


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector",choices=("high","low"),required=True)
    parser.add_argument("--endpoint",choices=("none","x","y"),required=True)
    parser.add_argument("--chunk-columns",type=int,default=4096)
    args = parser.parse_args()
    abstract_variables,abstract = abstract_scaled(args.endpoint)
    context,mapped = mapped_geometry(args.sector)
    polynomial,abstract_degrees = evaluate_abstract(abstract,mapped,context)
    power_terms = len(polynomial.terms())
    degrees,coefficients,replay_terms = tensor_bernstein_from_flint_matrix(
        polynomial,7,chunk_columns=args.chunk_columns
    )
    assert replay_terms == power_terms
    negative = sum(value < 0 for value in coefficients.flat)
    zero = sum(value == 0 for value in coefficients.flat)
    minimum = min(coefficients.flat)
    report = {
        "marker": MARKER,
        "sector": args.sector,"endpoint": args.endpoint,
        "abstract_variables": [str(value) for value in abstract_variables],
        "abstract_terms": len(abstract.terms()),
        "abstract_degrees": abstract_degrees,
        "mapped_power_terms": power_terms,
        "bernstein_degrees": list(map(int,degrees)),
        "bernstein_coefficients": int(coefficients.size),
        "negative": int(negative),"zero": int(zero),"minimum": str(minimum),
        "scope": "one tightened relaxation branch only; no theorem claim",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE/f"iso_n5_g1_adjacent_two_deficit_adaptive_coupled_cone_{args.sector}_{args.endpoint}_root_20260830.json"
    raw = json.dumps(report,indent=2,sort_keys=True)+"\n"
    output.write_text(raw,encoding="utf-8")
    print(json.dumps({key:report[key] for key in (
        "sector","endpoint","abstract_terms","mapped_power_terms",
        "bernstein_degrees","bernstein_coefficients","negative","zero","minimum",
    )},indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
