#!/usr/bin/env python3
"""Exact simplex probe for pairwise-separated positive u,v,p in singleton L."""

import argparse
import json

import sympy as sp

from derive_iso_n5_g2_singleton_l_strong_parent_cone_rank5_g2_alt import derive_strong
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients_fast,
)


MARKER = "PROBE_EXACT_ISO_N5_G2_SINGLETON_L_SEPARATED_SIMPLEX_RANK5_G2_ALT"


def f(value):
    return value * (value + 1) / 2


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--excess-vertex", choices=("zero", "u", "v", "p"), default="zero")
    parser.add_argument("--q-wedge", choices=("lower", "upper"), default="lower")
    parser.add_argument("--order-base", type=int, default=14)
    parser.add_argument("--geometry-elevation", type=int, default=0)
    parser.add_argument("--wedge-elevation", type=int, default=0)
    args = parser.parse_args()

    # C has no u-v common neighbor, hence its induced Q row has none either.
    strong, names = derive_strong(qcommon_upper=0)
    n=names["n"]; e=names["edge_count"]; du=names["degree_u"]
    dv=names["degree_v"]; dp=names["degree_p"]; W=names["C_wedges_E"]
    xu=names["C_neighbor_excess_u"]; xv=names["C_neighbor_excess_v"]
    xp=names["neighbor_excess_p"]; qW=names["Q_wedges_E"]
    qxu=names["Q_neighbor_excess_u"]; qxv=names["Q_neighbor_excess_v"]

    N,X,Y,Z,R,T,L = sp.symbols("N X Y Z R T L", nonnegative=True)
    variables=(N,X,Y,Z,R,T,L)
    nn=N+args.order_base
    # At every concavity vertex at least two selected centers have zero
    # neighbor excess.  Each such center is trapped in its own star component;
    # any remaining positive center needs one further component.  Hence c>=3,
    # so e<=n-3 and the degree/remainder simplex has total n-6.
    total=nn-6
    dx=total*X; dy=total*Y; dz=total*Z; remainder=total*R
    degree_u=1+dx; degree_v=1+dy; degree_p=1+dz
    edges=degree_u+degree_v+degree_p+remainder
    # With c>=3, all non-selected degree excess is at most remainder.
    excess_budget=remainder
    excess_values={"zero":(0,0,0),"u":(excess_budget,0,0),
                   "v":(0,excess_budget,0),"p":(0,0,excess_budget)}
    xuv,xvv,xpv=excess_values[args.excess_vertex]
    wedge_lower=f(dx)+f(dy)+f(dz)
    wedge_upper=wedge_lower+f(excess_budget)
    wedges=wedge_lower+T*(wedge_upper-wedge_lower)
    qe=edges-degree_p-xpv
    qwedges=0 if args.q_wedge=="lower" else qe*(qe-1)/2
    substitution={
        n:nn,e:edges,du:degree_u,dv:degree_v,dp:degree_p,W:wedges,
        xu:xuv,xv:xvv,xp:xpv,qW:qwedges,qxu:0,qxv:0,
        names["adjacent"]:0,names["adjacent_pu"]:0,names["adjacent_pv"]:0,
        names["common_neighbor_pu"]:0,names["common_neighbor_pv"]:0,
        names["C_common_neighbor"]:0,
    }
    numerator=sp.factor(sp.fraction(strong)[0])
    polynomial=sp.Poly(sp.expand(numerator.subs(substitution)),*variables)
    coefficients,stats=homogeneous_coefficients_fast(
        polynomial,args.geometry_elevation,0,wedge_elevation=args.wedge_elevation,
        parent_elevation=0,
    )
    negatives=sorted(((key,value) for key,value in coefficients.items() if value<0),key=lambda row:row[1])
    sampled=[]
    for nv in (0,1,10):
        for gi in range(5):
            geom=[0,0,0,0]
            if gi<4: geom[gi]=1
            for tv in (0,sp.Rational(1,2),1):
                point=(nv,*geom,tv,0)
                sampled.append((point,polynomial.eval(dict(zip(variables,point)))))
    sampled_min=min(sampled,key=lambda row:row[1])
    print(json.dumps({
        "marker":MARKER,"excess_vertex":args.excess_vertex,"q_wedge":args.q_wedge,
        "stats":stats,"negative":len(negatives),
        "minimum":str(min(coefficients.values())) if coefficients else "0",
        "first_negative":[(list(key),str(value)) for key,value in negatives[:5]],
        "sampled_minimum":[list(sampled_min[0]),str(sampled_min[1])],
    },indent=2,sort_keys=True))
    print(MARKER)


if __name__=="__main__":
    main()
