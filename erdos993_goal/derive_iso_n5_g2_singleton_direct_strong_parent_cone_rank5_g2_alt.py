#!/usr/bin/env python3
"""Exact strong lower cone for the complete singleton-ordinary g2 value.

The exact local invariant is reduced using induced-subforest containment,
forest star/nonstar motif payments, and the smooth third-star moment bound.
The output remains a sign-reduction cone; positivity is not asserted here.
"""

import sympy as sp

from derive_iso_n5_g2_singleton_l_parent_invariant_rank5_g2_alt import derive_parent


def choose(value, rank):
    return sp.prod(value-j for j in range(rank))/sp.factorial(rank)


def derive_strong():
    parent,s,x=derive_parent("singleton")
    n=s["n"];e=s["edge_count"];du=s["degree_u"];dv=s["degree_v"]
    W=s["C_wedges_E"];xu=s["C_neighbor_excess_u"];xv=s["C_neighbor_excess_v"]
    re=s["C_connected3_E"]
    qre=s["Q_connected3_E"]
    cE6=next(variable for variable in parent.free_symbols if str(variable)=="cE6")
    assert sp.diff(parent,cE6)==-6
    # i6(C)<=binom(n,6), and R3(Q)<=R3(C) because Q is induced in C.
    reduced=sp.expand(parent.subs({cE6:choose(n,6),qre:re}))
    a=sp.factor(sp.diff(reduced,re))
    b=sp.factor(sp.diff(reduced,s["C_connected3_U"]))
    c=sp.factor(sp.diff(reduced,s["C_connected3_V"]))
    k=sp.factor(sp.diff(reduced,s["C_three_edge_five"]))
    ku=sp.factor(sp.diff(reduced,x["C_three_edge_five_U"]))
    assert sp.expand(k-(2*n+9))==0
    assert sp.expand(ku-(6*n-5))==0
    t=sp.expand(k*(n-4)/4)
    tu=sp.expand(ku*(n-5)/4)
    bprime=sp.factor(b-tu);cprime=sp.factor(c-tu)
    kstar=sp.factor(a+bprime+cprime-t)
    print("a",a);print("bprime",bprime);print("cprime",cprime);print("kstar",kstar)
    star_floor=sp.factor(2*W*(W-e+1)/(3*(e-1)))
    deletion_u=choose(du,3)+choose(xu,2)
    deletion_v=choose(dv,3)+choose(xv,2)
    reserve=sp.factor(kstar*star_floor-bprime*deletion_u-cprime*deletion_v)
    high=[
        re,s["C_connected3_U"],s["C_connected3_V"],x["C_connected3_W"],
        s["C_three_edge_five"],s["C_connected4_E"],
        x["C_three_edge_five_U"],x["C_connected4_U"],
        x["C_three_edge_five_V"],x["C_connected4_V"],qre,
    ]
    low=sp.expand(reduced.subs({variable:0 for variable in high}))
    strong=sp.cancel(low+reserve)
    names={
        "n":n,"edge_count":e,"degree_u":du,"degree_v":dv,
        "degree_p":x["degree_p"],"neighbor_excess_p":x["neighbor_excess_p"],
        "adjacent":s["adjacent"],"adjacent_pu":x["adjacent_pu"],
        "adjacent_pv":x["adjacent_pv"],"common_neighbor_pu":x["common_neighbor_pu"],
        "common_neighbor_pv":x["common_neighbor_pv"],"C_wedges_E":W,
        "C_neighbor_excess_u":xu,"C_neighbor_excess_v":xv,
        "C_common_neighbor":s["C_common_neighbor"],"Q_wedges_E":s["Q_wedges_E"],
        "Q_neighbor_excess_u":s["Q_neighbor_excess_u"],
        "Q_neighbor_excess_v":s["Q_neighbor_excess_v"],
        "a":a,"bprime":bprime,"cprime":cprime,"kstar":kstar,
    }
    return strong,names


def main():
    strong,names=derive_strong()
    for key in ("Q_wedges_E","Q_neighbor_excess_u","Q_neighbor_excess_v",
                "C_wedges_E","C_neighbor_excess_u","C_neighbor_excess_v",
                "C_common_neighbor","neighbor_excess_p"):
        variable=names[key]
        print("DERIV",key,sp.factor(sp.diff(strong,variable)))
        print("CURV",key,sp.factor(sp.diff(strong,variable,2)))
    numerator,denominator=map(sp.factor,sp.fraction(strong))
    print("DENOMINATOR",denominator)
    print("TERMS",len(sp.Poly(numerator,*sorted(numerator.free_symbols,key=str)).terms()))
    print("SYMBOLS"," ".join(map(str,sorted(numerator.free_symbols,key=str))))


if __name__=="__main__":
    main()
