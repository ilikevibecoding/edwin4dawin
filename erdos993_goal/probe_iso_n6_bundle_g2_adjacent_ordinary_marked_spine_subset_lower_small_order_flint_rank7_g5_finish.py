#!/usr/bin/env python3
"""Exact N>=19 spine-lower Bernstein shards with one induced order 0..6."""

from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
from flint import fmpq_mpoly_ctx
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import sha256
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import compactify_one,split_simplex
from probe_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_flint_rank7_g5_finish import REDUCTION,REDUCTION_SHA256,scaled_source
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix

HERE=Path(__file__).resolve().parent
MARKER="PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_SMALL_ORDER_FLINT_RANK7_G5_FINISH"
LARGE_SOURCE=HERE/"probe_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_flint_rank7_g5_finish.py"
LARGE_SOURCE_SHA256="00990C03ED0FF36E3A62D19619955E13BC3AAEC178136F61FCD34B3C2893810B"


def build_source(ctx,small_side,k,bmask,cmask):
    y,z,w,u0,u1,u2,u3,u4,h=ctx.gens();one=ctx.constant(1);n=19+h;small=ctx.constant(k);large=n-small+small*y;overlap=small*y
    if small_side=="B":mb,mc=small,large
    else:mb,mc=large,small
    source=scaled_source(n,mb,mc,overlap,z,w,(u0,u1,u2,u3,u4),bmask,cmask,one)
    return source,{"small_side":small_side,"small_order":k,"B_mask":bmask,"C_mask":cmask,"positive_multiplier":"N^4*a2^4","geometry":f"N=19+h; {small_side}={k}; large=N-small+small*y; overlap=small*y; e=overlap*z; Omega=e^2*w/2","simplex":"u0+...+u4=1","reduced_four_corner_mode":True}


def main():
    ap=argparse.ArgumentParser();ap.add_argument("--small-side",choices=("B","C"),required=True);ap.add_argument("--small-order",type=int,choices=range(7),required=True);ap.add_argument("--b-mask",type=int,choices=(0,1),required=True);ap.add_argument("--c-mask",type=int,choices=(0,1),required=True);ap.add_argument("--inspect-only",action="store_true");ap.add_argument("--start-beta",type=int,default=0);ap.add_argument("--max-betas",type=int,default=1000000);ap.add_argument("--chunk-columns",type=int,default=4096);args=ap.parse_args();assert sha256(REDUCTION)==REDUCTION_SHA256;assert sha256(LARGE_SOURCE)==LARGE_SOURCE_SHA256
    names=("y","z","w","u0","u1","u2","u3","u4","h");ctx=fmpq_mpoly_ctx.get(names,"degrevlex");source,meta=build_source(ctx,args.small_side,args.small_order,args.b_mask,args.c_mask);terms=list(source.terms());coefctx=fmpq_mpoly_ctx.get(("y","z","w","h"),"degrevlex");degree,betas,coeffs,grouped=split_simplex(source,coefctx,3,1);summary={**meta,"source_terms":len(terms),"source_degrees":{name:int(max(m[axis] for m,_ in terms)) for axis,name in enumerate(names)},"simplex_degree":degree,"raw_simplex_monomials":grouped,"homogeneous_simplex_coefficients":len(betas)};print(json.dumps(summary,indent=2,sort_keys=True),flush=True)
    if args.inspect_only:print(MARKER+"_INSPECT_ONLY");return
    stop=min(len(betas),args.start_beta+args.max_betas);targetctx=fmpq_mpoly_ctx.get(("y","z","w","H"),"degrevlex");records=[];digest=hashlib.sha256()
    for index in range(args.start_beta,stop):
        mapped,dh,ct=compactify_one(coeffs[index],targetctx,3);degrees,values,replay=tensor_bernstein_from_flint_matrix(mapped,4,chunk_columns=args.chunk_columns);assert replay==len(list(mapped.terms()));minimum=min(values.flat);record={"beta_index":index,"beta":betas[index],"coefficient_terms":ct,"compactification_degree_h":dh,"bernstein_degrees":list(map(int,degrees)),"bernstein_coefficients":int(values.size),"negative":sum(v<0 for v in values.flat),"zero":sum(v==0 for v in values.flat),"minimum":str(minimum)};records.append(record);digest.update(json.dumps(record,separators=(",",":"),sort_keys=True).encode());print(json.dumps(record,sort_keys=True),flush=True)
    report={"marker":MARKER,**summary,"start_beta":args.start_beta,"stop_beta":stop,"processed_betas":len(records),"negative_betas":sum(r["negative"]>0 for r in records),"ordered_record_sha256":digest.hexdigest().upper(),"records":records,"scope":"N>=19 adjacent marked-spine ordinary lower; one induced order 0..6; one corner","reduction_report_sha256":REDUCTION_SHA256,"large_producer_sha256":LARGE_SOURCE_SHA256,"source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()};out=HERE/f"iso_n6_bundle_g2_adjacent_ordinary_spine_lower_small_{args.small_side}{args.small_order}_B{args.b_mask}_C{args.c_mask}_beta{args.start_beta}_{stop}_flint_rank7_g5_finish_20260831.json";raw=json.dumps(report,indent=2,sort_keys=True)+"\n";out.write_text(raw,encoding="utf-8",newline="\n");print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)


if __name__=="__main__":main()
