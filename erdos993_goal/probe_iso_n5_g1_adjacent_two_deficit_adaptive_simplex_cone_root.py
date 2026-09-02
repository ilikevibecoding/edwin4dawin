#!/usr/bin/env python3
"""Native-simplex exact cone probe for adjacent two-deficit g1.

Unlike the stick-breaking tensor probe, this keeps the component allocation
(p-1,q-1,unused components,edges) as one barycentric 4-simplex and the
factorial-drop allocation as one barycentric 5-simplex (4-simplex in the low
sector).  Sparse homogeneous completion is exactly the simplex Bernstein
transform and avoids the large tensor expansion.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from probe_iso_n5_g1_adjacent_two_deficit_adaptive_coupled_cone_root import (
    abstract_scaled,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_ADAPTIVE_SIMPLEX_CONE_ROOT"


def compositions(total: int, parts: int):
    if parts == 1:
        yield (total,)
        return
    for first in range(total+1):
        for rest in compositions(total-first,parts-1):
            yield (first,*rest)


def multinomial(exponents):
    total = sum(exponents)
    out = math.factorial(total)
    for exponent in exponents:
        out //= math.factorial(exponent)
    return out


def mapped_simplex(sector: str):
    ratio_count = 5 if sector == "high" else 4
    names = ["P","Q","S","E",*[f"H{i}" for i in range(ratio_count)]]
    if sector == "low":
        names.append("R")
    names.append("N")
    context = fmpq_mpoly_ctx.get(names,"degrevlex")
    gens = context.gens()
    P,Q,S,E = gens[:4]
    H = gens[4:4+ratio_count]
    offset = 4+ratio_count
    R = gens[offset] if sector == "low" else None
    N = gens[-1]
    n = N+13
    total = n-2
    p = 1+total*P
    q = 1+total*Q
    edges = total*E
    R1 = 2*n*(n-1)-4*edges
    budget = R1-4*n
    if sector == "high":
        R5 = budget*H[0]
        D4,D3,D2 = (budget*H[index] for index in (1,2,3))
        R4 = R5+n+D4
        R3 = R4+n+D3
        R2 = R3+n+D2
        # On sum(H)=1 the omitted H4 is exactly the final delta1 share.
    else:
        R5 = budget*H[0]
        D4,D3,D2 = (budget*H[index] for index in (1,2,3))
        R4 = R5+n+D4
        R3 = R4+n+D3
        R2 = R3+2*n-n*R+D2
        # On sum(H)=1, R1=R2+nR.  R in [0,1] is delta1.
    return context,(n,p,q,edges,R1,R2,R3,R4,R5),ratio_count


def evaluate(polynomial,mapped,context):
    degrees = [polynomial.degree(index) for index in range(len(mapped))]
    powers = [[context.constant(1)] for _ in mapped]
    for axis,value in enumerate(mapped):
        for exponent in range(1,degrees[axis]+1):
            powers[axis].append(powers[axis][-1]*value)

    def stream():
        for monomial,coefficient in polynomial.terms():
            numerator,denominator = map(int,sp.fraction(coefficient))
            term = context.constant(fmpq(numerator,denominator))
            for axis,exponent in enumerate(monomial):
                term *= powers[axis][exponent]
            yield term

    return balanced_batched_sum(stream(),batch_size=64)


def homogeneous_coefficients(poly,sector,ratio_count):
    terms = list(poly.terms())
    interval_axis = 4+ratio_count if sector == "low" else None
    n_axis = len(terms[0][0])-1
    geom_degree = max(sum(monomial[:4]) for monomial,_ in terms)
    ratio_degree = max(sum(monomial[4:4+ratio_count]) for monomial,_ in terms)
    interval_degree = (
        max(monomial[interval_axis] for monomial,_ in terms)
        if sector == "low" else 0
    )
    comp_cache = {}
    def expansions(missing,parts):
        key=(missing,parts)
        if key not in comp_cache:
            comp_cache[key]=[(row,multinomial(row)) for row in compositions(missing,parts)]
        return comp_cache[key]

    coefficients = defaultdict(lambda: fmpq(0))
    for monomial,coefficient in terms:
        geom = monomial[:4]
        ratio = monomial[4:4+ratio_count]
        interval = monomial[interval_axis] if sector == "low" else 0
        n_power = monomial[n_axis]
        mg = geom_degree-sum(geom)
        mr = ratio_degree-sum(ratio)
        mi = interval_degree-interval
        for add_g,coef_g in expansions(mg,4):
            out_g=tuple(geom[index]+add_g[index] for index in range(4))
            for add_r,coef_r in expansions(mr,ratio_count):
                out_r=tuple(ratio[index]+add_r[index] for index in range(ratio_count))
                if sector == "low":
                    for add_R in range(mi+1):
                        # (R+T)^mi; retain both homogeneous exponents.
                        out_interval=(interval+add_R,mi-add_R)
                        key=(*out_g,*out_r,*out_interval,n_power)
                        coefficients[key] += coefficient*coef_g*coef_r*math.comb(mi,add_R)
                else:
                    key=(*out_g,*out_r,n_power)
                    coefficients[key] += coefficient*coef_g*coef_r
    coefficients={key:value for key,value in coefficients.items() if value}
    return coefficients,{
        "geometry_degree":int(geom_degree),
        "ratio_degree":int(ratio_degree),
        "interval_degree":int(interval_degree),
        "homogeneous_coefficients":len(coefficients),
    }


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--sector",choices=("high","low"),required=True)
    parser.add_argument("--endpoint",choices=("none","x","y"),required=True)
    parser.add_argument("--mapped-only",action="store_true")
    args=parser.parse_args()
    _variables,abstract=abstract_scaled(args.endpoint)
    context,mapped,ratio_count=mapped_simplex(args.sector)
    poly=evaluate(abstract,mapped,context)
    poly_terms=list(poly.terms())
    mapped_terms=len(poly_terms)
    mapped_degrees=[int(max(monomial[axis] for monomial,_ in poly_terms)) for axis in range(len(context.gens()))]
    if args.mapped_only:
        print(json.dumps({
            "sector":args.sector,"endpoint":args.endpoint,
            "abstract_terms":len(abstract.terms()),"mapped_terms":mapped_terms,
            "mapped_degrees":mapped_degrees,
        },indent=2))
        return
    coefficients,stats=homogeneous_coefficients(poly,args.sector,ratio_count)
    negative=sum(value<0 for value in coefficients.values())
    zero=0
    minimum=min(coefficients.values())
    report={
        "marker":MARKER,"sector":args.sector,"endpoint":args.endpoint,
        "abstract_terms":len(abstract.terms()),"mapped_terms":mapped_terms,
        "mapped_degrees":mapped_degrees,**stats,
        "negative":negative,"zero":zero,"minimum":str(minimum),
        "all_simplex_bernstein_power_coefficients_nonnegative":negative==0,
        "scope":"one tightened native-simplex relaxation branch only; no theorem claim",
        "source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output=HERE/f"iso_n5_g1_adjacent_two_deficit_adaptive_simplex_cone_{args.sector}_{args.endpoint}_root_20260830.json"
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"
    output.write_text(raw,encoding="utf-8")
    print(json.dumps(report,indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":
    main()
