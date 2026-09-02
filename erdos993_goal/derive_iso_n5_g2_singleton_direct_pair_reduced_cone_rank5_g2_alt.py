#!/usr/bin/env python3
"""Exact Q-variable elimination from the pair-motif singleton cone."""

import sympy as sp

from derive_iso_n5_g2_singleton_direct_pair_motif_cone_rank5_g2_alt import derive_pair_cone


def derive_reduced(q3_scale=sp.Integer(0),q3_w_scale=sp.Integer(0)):
    cone,names=derive_pair_cone(q3_scale=q3_scale,q3_w_scale=q3_w_scale);n=names["n"];e=names["edge_count"]
    du=names["degree_u"];dv=names["degree_v"];dp=names["degree_p"]
    xp=names["neighbor_excess_p"];apu=names["adjacent_pu"];apv=names["adjacent_pv"]
    cpu=names["common_neighbor_pu"];cpv=names["common_neighbor_pv"]
    qW=names["Q_wedges_E"];qxu=names["Q_neighbor_excess_u"];qxv=names["Q_neighbor_excess_v"]
    assert sp.expand(sp.diff(cone,qW)-2*(-3*dp+4*n-10))==0
    assert sp.diff(cone,qxu)==5-6*n and sp.diff(cone,qxv)==5-6*n
    qe=e-dp-xp;qdu=(1-apu)*du-cpu;qdv=(1-apv)*dv-cpv
    return sp.expand(cone.subs({qW:0,qxu:qe-qdu,qxv:qe-qdv})),names


def main():
    reduced,_=derive_reduced();print("TERMS",len(sp.Poly(reduced,*sorted(reduced.free_symbols,key=str)).terms()))
    print("SYMBOLS"," ".join(map(str,sorted(reduced.free_symbols,key=str))))


if __name__=="__main__":main()
