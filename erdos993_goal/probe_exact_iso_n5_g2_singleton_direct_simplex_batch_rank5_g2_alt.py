#!/usr/bin/env python3
"""Batch exact simplex probes for complete singleton-ordinary g2."""

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g2_singleton_direct_reduced_cone_rank5_g2_alt import derive_reduced
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein import (
    branch_key,canonical_branches,
)
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients_fast,mapped_polynomial,
)


HERE=Path(__file__).resolve().parent
MARKER="PROBE_EXACT_ISO_N5_G2_SINGLETON_DIRECT_SIMPLEX_BATCH_RANK5_G2_ALT"


def main():
    p=argparse.ArgumentParser();p.add_argument("--start",type=int,default=0)
    p.add_argument("--count",type=int,default=136);p.add_argument("--max-elevation",type=int,default=2)
    p.add_argument("--order-base",type=int,default=14);args=p.parse_args()
    branches=canonical_branches(); selected=list(enumerate(branches))[args.start:args.start+args.count]
    reduced,_=derive_reduced();numerator=sp.factor(sp.fraction(reduced)[0])
    rows=[]
    for offset,(index,branch) in enumerate(selected):
        degrees,adjacency,common,endpoints,uv_common,parent_state,parent_interval=branch
        polynomial,_=mapped_polynomial(
            degrees,adjacency,common,endpoints,"centers",1,0,0,uv_common,
            args.order_base,numerator=numerator,parent_state=parent_state,
            positive_parent_interval=parent_interval,
        )
        attempts=[];passed=False
        for elevation in range(args.max_elevation+1):
            coefficients,stats=homogeneous_coefficients_fast(polynomial,elevation,elevation)
            negative=sum(value<0 for value in coefficients.values());minimum=min(coefficients.values())
            attempts.append({"elevation":elevation,**stats,"negative":negative,"minimum":str(minimum)})
            if negative==0:passed=True;break
        row={"index":index,"branch":branch_key(branch),"passed":passed,"attempts":attempts}
        rows.append(row)
        print(json.dumps({"progress":f"{offset+1}/{len(selected)}","index":index,
                          "branch":row["branch"],"passed":passed,"last":attempts[-1]},sort_keys=True),flush=True)
    stop=args.start+len(selected)
    report={"marker":MARKER,"canonical_branch_total":len(branches),
            "requested_range":[args.start,stop],"checked":len(rows),
            "passed":sum(row["passed"] for row in rows),
            "failed":sum(not row["passed"] for row in rows),"order_base":args.order_base,
            "maximum_elevation":args.max_elevation,"rows":rows,
            "scope":"Exact direct singleton-g2 cone probes for this branch range only; no theorem claim.",
            "source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    output=HERE/f"iso_n5_g2_singleton_direct_simplex_batch_{args.start}_{stop}_rank5_g2_alt_20260830.json"
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";output.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"output":output.name,"checked":report["checked"],
                      "passed":report["passed"],"failed":report["failed"],
                      "report_sha256":hashlib.sha256(raw.encode()).hexdigest().upper()},indent=2),flush=True)
    print(MARKER,flush=True)


if __name__=="__main__":main()
