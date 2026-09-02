#!/usr/bin/env python3
"""Fail-closed exact simplex probe for complete singleton-ordinary g2."""

import argparse
import json

import sympy as sp

from derive_iso_n5_g2_singleton_direct_reduced_cone_rank5_g2_alt import derive_reduced
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients_fast,mapped_polynomial,parse_bits,
    parse_endpoint_states,valid_endpoint_branch,valid_parent_state,
)


MARKER="PROBE_EXACT_ISO_N5_G2_SINGLETON_DIRECT_SIMPLEX_RANK5_G2_ALT"


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--degrees",default="111");p.add_argument("--adjacency",default="000")
    p.add_argument("--common",default="00");p.add_argument("--endpoints",default="UU")
    p.add_argument("--w-lower",choices=("zero","centers"),default="centers")
    p.add_argument("--subdivisions",type=int,default=1);p.add_argument("--w-cell",type=int,default=0)
    p.add_argument("--p-cell",type=int,default=0);p.add_argument("--uv-common",type=int,choices=(0,1),default=0)
    p.add_argument("--parent-state",choices=("Z","P"),default="P")
    p.add_argument("--positive-parent-interval",choices=("full","lower","above"),default="full")
    p.add_argument("--order-base",type=int,default=14);p.add_argument("--geometry-elevation",type=int,default=0)
    p.add_argument("--wedge-elevation",type=int,default=0);p.add_argument("--parent-elevation",type=int,default=0)
    args=p.parse_args()
    degrees=parse_bits(args.degrees,3);adjacency=parse_bits(args.adjacency,3)
    common=parse_bits(args.common,2);endpoints=parse_endpoint_states(args.endpoints)
    if not valid_endpoint_branch(degrees,adjacency,common,endpoints):raise ValueError("incompatible branch")
    if not valid_parent_state(degrees,adjacency,common,args.parent_state):raise ValueError("incompatible parent state")
    reduced,_=derive_reduced(); numerator=sp.factor(sp.fraction(reduced)[0])
    polynomial,_=mapped_polynomial(
        degrees,adjacency,common,endpoints,args.w_lower,args.subdivisions,
        args.w_cell,args.p_cell,args.uv_common,args.order_base,numerator=numerator,
        parent_state=args.parent_state,positive_parent_interval=args.positive_parent_interval,
    )
    coefficients,stats=homogeneous_coefficients_fast(
        polynomial,args.geometry_elevation,0,wedge_elevation=args.wedge_elevation,
        parent_elevation=args.parent_elevation,
    )
    negatives=sorted(((key,value) for key,value in coefficients.items() if value<0),key=lambda row:row[1])
    print(json.dumps({"marker":MARKER,"branch":{
        "degrees":args.degrees,"adjacency":args.adjacency,"common":args.common,
        "endpoints":args.endpoints,"uv_common":args.uv_common,"parent_state":args.parent_state,
        "positive_parent_interval":args.positive_parent_interval},"stats":stats,
        "negative":len(negatives),"minimum":str(min(coefficients.values())) if coefficients else "0",
        "first_negative":[(list(key),str(value)) for key,value in negatives[:5]]},indent=2,sort_keys=True))
    print(MARKER)


if __name__=="__main__":main()
