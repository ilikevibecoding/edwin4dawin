#!/usr/bin/env python3
"""Exact n>=14 reduced cone for complete singleton-ordinary g2."""

import sympy as sp

from derive_iso_n5_g2_singleton_direct_strong_parent_cone_rank5_g2_alt import derive_strong


def derive_reduced():
    strong,names=derive_strong()
    n=names["n"];e=names["edge_count"];du=names["degree_u"];dv=names["degree_v"]
    dp=names["degree_p"];xp=names["neighbor_excess_p"]
    apu=names["adjacent_pu"];apv=names["adjacent_pv"]
    cpu=names["common_neighbor_pu"];cpv=names["common_neighbor_pv"]
    qW=names["Q_wedges_E"];qxu=names["Q_neighbor_excess_u"]
    qxv=names["Q_neighbor_excess_v"]
    kW=sp.factor(sp.diff(strong,qW));ku=sp.factor(sp.diff(strong,qxu));kv=sp.factor(sp.diff(strong,qxv))
    assert sp.expand(kW-2*(-3*dp+4*n-10))==0
    assert ku==5-6*n and kv==5-6*n
    # For n>=14, dp<=n-1 gives kW>=2(n-7)>0.  The negative excess
    # coefficients use qx<=qe-qdegree in the induced Q forest.
    qe=e-dp-xp
    qdu=(1-apu)*du-cpu
    qdv=(1-apv)*dv-cpv
    reduced=sp.cancel(strong.subs({qW:0,qxu:qe-qdu,qxv:qe-qdv}))
    return reduced,names


def main():
    reduced,names=derive_reduced()
    common=names["C_common_neighbor"]
    coefficient=sp.factor(sp.diff(reduced,common))
    print("COMMON_COEFFICIENT",coefficient)
    numerator,denominator=map(sp.factor,sp.fraction(reduced))
    print("DENOMINATOR",denominator)
    print("TERMS",len(sp.Poly(numerator,*sorted(numerator.free_symbols,key=str)).terms()))
    print("SYMBOLS"," ".join(map(str,sorted(numerator.free_symbols,key=str))))


if __name__=="__main__":
    main()
