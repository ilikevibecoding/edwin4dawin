#!/usr/bin/env python3
"""Batch exact simplex probes for the rigorous pair-motif singleton cone."""

import argparse,hashlib,json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g2_singleton_direct_pair_reduced_cone_rank5_g2_alt import derive_reduced
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein import branch_key,canonical_branches
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import homogeneous_coefficients_fast,mapped_polynomial

HERE=Path(__file__).resolve().parent
MARKER="PROBE_EXACT_ISO_N5_G2_SINGLETON_DIRECT_PAIR_SIMPLEX_BATCH_RANK5_G2_ALT"


def main():
    p=argparse.ArgumentParser();p.add_argument("--start",type=int,default=0);p.add_argument("--count",type=int,default=136)
    p.add_argument("--max-elevation",type=int,default=2);p.add_argument("--order-base",type=int,default=14)
    p.add_argument("--q3-scale",default="auto",help="exact rational scale or auto (1 on uv=00, 3/4 otherwise)")
    p.add_argument("--q3-w-scale",default="0",help="exact rational Q3(C_W) reserve scale")
    args=p.parse_args()
    branches=canonical_branches();selected=list(enumerate(branches))[args.start:args.start+args.count]
    if args.q3_scale=="auto":
        scales=(sp.Integer(1),sp.Rational(3,4))
    else:
        scale=sp.Rational(args.q3_scale)
        if scale < 0:
            raise ValueError("q3-scale must be nonnegative")
        scales=(scale,)
    numerators={}
    q3_w_scale=sp.Rational(args.q3_w_scale)
    if q3_w_scale < 0:
        raise ValueError("q3-w-scale must be nonnegative")
    for scale in scales:
        reduced,names=derive_reduced(q3_scale=scale,q3_w_scale=q3_w_scale)
        positive_uv=names["positive_degree_u_v"]
        # The final distance-three motif allowance is present exactly when
        # both marked vertices have positive degree.
        for flag in (0,1):
            numerators[(scale,flag)]=sp.expand(reduced.subs(positive_uv,flag))
    rows=[]
    for offset,(index,branch) in enumerate(selected):
        degrees,adjacency,common,endpoints,uv_common,parent_state,parent_interval=branch
        q3_scale=(sp.Integer(1) if args.q3_scale=="auto" and not (degrees[0] or degrees[1])
                  else sp.Rational(3,4) if args.q3_scale=="auto" else scales[0])
        numerator=numerators[(q3_scale,degrees[0]*degrees[1])]
        polynomial,_=mapped_polynomial(degrees,adjacency,common,endpoints,"centers",1,0,0,uv_common,
            args.order_base,numerator=numerator,parent_state=parent_state,positive_parent_interval=parent_interval)
        attempts=[];passed=False
        for elevation in range(args.max_elevation+1):
            coefficients,stats=homogeneous_coefficients_fast(polynomial,elevation,elevation)
            negative=sum(value<0 for value in coefficients.values());minimum=min(coefficients.values())
            attempts.append({"elevation":elevation,**stats,"negative":negative,"minimum":str(minimum)})
            if negative==0:passed=True;break
        row={"index":index,"branch":branch_key(branch),"q3_reserve_scale":str(q3_scale),
             "passed":passed,"attempts":attempts};rows.append(row)
        print(json.dumps({"progress":f"{offset+1}/{len(selected)}","index":index,"branch":row["branch"],
                          "passed":passed,"last":attempts[-1]},sort_keys=True),flush=True)
    stop=args.start+len(selected);report={"marker":MARKER,"canonical_branch_total":len(branches),
        "requested_range":[args.start,stop],"checked":len(rows),"passed":sum(r["passed"] for r in rows),
        "failed":sum(not r["passed"] for r in rows),"order_base":args.order_base,
        "maximum_elevation":args.max_elevation,"rows":rows,
        "q3_reserve_scale":args.q3_scale,
        "q3_w_reserve_scale":str(q3_w_scale),
        "scope":"Exact pair-motif singleton-g2 cone probes for this range only; no theorem claim.",
        "source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    output=HERE/f"iso_n5_g2_singleton_direct_pair_simplex_batch_{args.start}_{stop}_rank5_g2_alt_20260830.json"
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";output.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"output":output.name,"checked":report["checked"],"passed":report["passed"],
                      "failed":report["failed"],"report_sha256":hashlib.sha256(raw.encode()).hexdigest().upper()},indent=2),flush=True)
    print(MARKER,flush=True)


if __name__=="__main__":main()
