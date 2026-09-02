#!/usr/bin/env python3
"""Independent exact audit of one adjacent-g1 adaptive simplex branch.

The target, adaptive/path substitutions, geometry and ratio maps are rebuilt
locally.  Homogeneous simplex completion is then performed by direct FLINT
polynomial multiplication, independently of the producer's termwise Python
multinomial expansion.  Equality of the resulting sign statistics with the
producer report is required fail-closed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum


HERE=Path(__file__).resolve().parent
MARKER="PASS_INDEPENDENT_EXACT_ISO_N5_G1_ADJACENT_ADAPTIVE_SIMPLEX_BRANCH_G1_BERNSTEIN"


def abstract(endpoint):
    n,p,q,e,r1,r2,r3,r4,r5=sp.symbols("n p q e r1 r2 r3 r4 r5")
    variables=(n,p,q,e,r1,r2,r3,r4,r5)
    a=(
        sp.Integer(1),n,r1/4,r1*r2/(24*n),r1*r2*r3/(192*n**2),
        r1*r2*r3*r4/(1920*n**3),r1*r2*r3*r4*r5/(23040*n**4),
    )

    def choose(value,k):
        return sp.prod(value-j for j in range(k))/sp.factorial(k)

    def row(d,incident):
        m=n-d
        return (
            sp.Integer(0),d,d*n-d*(d+1)/2-incident,
            a[3]-choose(m-2,3),
            a[4]*(a[4]-choose(m,4))/choose(n,4),
            a[5]*(a[5]-choose(m,5))/choose(n,5),
        )

    x=row(p,e if endpoint=="x" else 0)
    y=row(q,e if endpoint=="y" else 0)
    face=(
        4*a[1]*a[2]+2*a[1]*a[3]-26*a[1]*a[4]-29*a[1]*a[5]
        -6*a[1]*a[6]+14*a[2]**2+30*a[2]*a[3]-8*a[2]*a[4]
        -8*a[2]*a[5]+21*a[3]**2+6*a[3]*a[4]
    )

    def T(z):
        return (
            (2*a[2]-a[3]-10*a[4]-6*a[5])*z[1]
            +2*(a[1]+5*a[2]+4*a[3]-a[4])*z[2]
            +(-a[1]+8*a[2]+8*a[3])*z[3]
            -2*(5*a[1]+a[2])*z[4]-6*a[1]*z[5]
        )

    def K(left,right):
        return (
            2*left[1]*right[2]-3*left[1]*right[3]-6*left[1]*right[4]
            +2*left[2]*right[1]+6*left[2]*right[2]+4*left[2]*right[3]
            -3*left[3]*right[1]+4*left[3]*right[2]-6*left[4]*right[1]
        )

    scale=46080*n**5*choose(n,4)*choose(n,5)
    numerator,denominator=sp.fraction(sp.cancel(scale*(face-T(x)-T(y)+K(x,y))))
    denominator=sp.Poly(denominator,*variables,domain=sp.QQ)
    assert denominator.total_degree()==0 and denominator.TC()>0
    return sp.Poly(numerator/denominator.TC(),*variables,domain=sp.QQ)


def map_branch(sector,polynomial):
    ratio_count=5 if sector=="high" else 4
    names=["P","Q","S","E",*[f"H{i}" for i in range(ratio_count)]]
    if sector=="low":
        names.extend(("R","T"))
    names.append("N")
    context=fmpq_mpoly_ctx.get(names,"degrevlex")
    gens=context.gens()
    P,Q,S,E=gens[:4]
    H=gens[4:4+ratio_count]
    offset=4+ratio_count
    R=gens[offset] if sector=="low" else None
    N=gens[-1]
    n=N+13; total=n-2
    p=1+total*P; q=1+total*Q; edges=total*E
    R1=2*n*(n-1)-4*edges; budget=R1-4*n
    R5=budget*H[0]
    D4,D3,D2=(budget*H[index] for index in (1,2,3))
    R4=R5+n+D4; R3=R4+n+D3
    if sector=="high":
        R2=R3+n+D2
        assert R1-R2-(n+budget*H[4]) == budget*(1-sum(H,context.constant(0)))
    else:
        R2=R3+2*n-n*R+D2
        assert R1-R2-n*R == budget*(1-sum(H,context.constant(0)))
    mapped=(n,p,q,edges,R1,R2,R3,R4,R5)
    degrees=[polynomial.degree(index) for index in range(len(mapped))]
    powers=[[context.constant(1)] for _ in mapped]
    for axis,value in enumerate(mapped):
        for exponent in range(1,degrees[axis]+1):
            powers[axis].append(powers[axis][-1]*value)

    def stream():
        for monomial,coefficient in polynomial.terms():
            num,den=map(int,sp.fraction(coefficient))
            term=context.constant(fmpq(num,den))
            for axis,exponent in enumerate(monomial):
                term*=powers[axis][exponent]
            yield term

    return context,balanced_batched_sum(stream(),batch_size=64),ratio_count


def homogeneous_flint(context,poly,sector,ratio_count):
    terms=list(poly.terms())
    interval_axis=4+ratio_count if sector=="low" else None
    geom_degree=max(sum(m[:4]) for m,_ in terms)
    ratio_degree=max(sum(m[4:4+ratio_count]) for m,_ in terms)
    interval_degree=max((m[interval_axis] for m,_ in terms),default=0) if sector=="low" else 0
    groups=defaultdict(dict)
    for monomial,coefficient in terms:
        key=(sum(monomial[:4]),sum(monomial[4:4+ratio_count]),
             monomial[interval_axis] if sector=="low" else 0)
        groups[key][monomial]=coefficient
    gens=context.gens()
    geom_sum=sum(gens[:4],context.constant(0))
    ratio_sum=sum(gens[4:4+ratio_count],context.constant(0))
    interval_sum=(gens[interval_axis]+gens[interval_axis+1]) if sector=="low" else context.constant(1)

    def completed_groups():
        for (dg,dr,di),data in groups.items():
            yield (context.from_dict(data)*geom_sum**(geom_degree-dg)
                   *ratio_sum**(ratio_degree-dr)*interval_sum**(interval_degree-di))

    completed=balanced_batched_sum(completed_groups(),batch_size=8)
    return completed,{
        "geometry_degree":int(geom_degree),"ratio_degree":int(ratio_degree),
        "interval_degree":int(interval_degree),
    }


def coefficient_digest(poly):
    digest=hashlib.sha256(); negative=zero=0; minimum=None; count=0
    for monomial,coefficient in poly.terms():
        count+=1; negative+=int(coefficient<0); zero+=int(coefficient==0)
        minimum=coefficient if minimum is None or coefficient<minimum else minimum
        digest.update((str(tuple(map(int,monomial)))+"|"+str(coefficient)+";").encode())
    return {
        "homogeneous_coefficients":count,"negative":negative,"zero":zero,
        "minimum":str(minimum),"coefficient_stream_sha256":digest.hexdigest().upper(),
    }


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--sector",choices=("high","low"),required=True)
    parser.add_argument("--endpoint",choices=("none","x"),required=True)
    args=parser.parse_args()
    producer_path=HERE/f"iso_n5_g1_adjacent_two_deficit_adaptive_simplex_cone_{args.sector}_{args.endpoint}_root_20260830.json"
    producer=json.loads(producer_path.read_text(encoding="utf-8"))
    context,mapped,ratio_count=map_branch(args.sector,abstract(args.endpoint))
    completed,degrees=homogeneous_flint(context,mapped,args.sector,ratio_count)
    stats=coefficient_digest(completed)
    assert stats["negative"]==producer["negative"]==0
    assert stats["homogeneous_coefficients"]==producer["homogeneous_coefficients"]
    assert stats["minimum"]==producer["minimum"]
    report={
        "marker":MARKER,"sector":args.sector,"endpoint":args.endpoint,
        **degrees,**stats,
        "producer_report_sha256":hashlib.sha256(producer_path.read_bytes()).hexdigest().upper(),
        "scope":"independent exact replay of one adaptive simplex branch",
        "source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output=HERE/f"iso_n5_g1_adjacent_adaptive_simplex_independent_audit_{args.sector}_{args.endpoint}_g1_bernstein_20260830.json"
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"
    output.write_text(raw,encoding="utf-8")
    print(json.dumps(report,indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":
    main()
