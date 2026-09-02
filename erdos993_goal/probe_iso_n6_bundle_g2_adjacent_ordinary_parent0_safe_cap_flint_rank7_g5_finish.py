#!/usr/bin/env python3
"""Exact N>=19 Bernstein shards for adjacent marks, parent adjacent to neither."""

from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from flint import fmpq, fmpq_mpoly_ctx
from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose, sha256
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS, K2_TERMS, L2_TERMS, compactify_one, row_corner, scaled_bilinear, split_simplex

HERE = Path(__file__).resolve().parent
REDUCTION = HERE / "iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_lower_exact_rank7_g5_finish_20260831.json"
REDUCTION_SHA256 = "D269AE7EF028A81175C8FC0D17F9562A6B2ECE000D957F247ED845D8E12414A0"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_SAFE_CAP_FLINT_RANK7_G5_FINISH"
MAX_N_DEN = MAX_A2_DEN = 4


def scaled_linear(terms, cap, n, a2):
    return balanced_batched_sum((coef*cap*row[rank][0]*n**(MAX_N_DEN-row[rank][1])*a2**(MAX_A2_DEN-row[rank][2]) for coef,row,rank in terms), batch_size=32)


def scaled_source(n, mb, mc, overlap, z, w, simplex, bmask, cmask, one, use_linear_wedge_floor=False):
    u0,u1,u2,u3,u4 = simplex
    edges = overlap*z
    if use_linear_wedge_floor:
        omega_floor = 2*edges-n
        omega = omega_floor+(edges**2*fmpq(1,2)-omega_floor)*w
    else:
        omega = edges**2*w*fmpq(1,2)
    a2 = choose(n,2,one)-edges
    a3 = choose(n,3,one)-edges*(n-2)+omega
    budget = 6*n*a3-4*n*a2
    r3=3*n*a2+budget*(u0+u1+u2+u3)
    r4=2*n*a2+budget*(u0+u1+u2)
    r5=n*a2+budget*(u0+u1)
    r6=budget*u0
    a=((one,0,0),(n,0,0),(a2,0,0),(a3,0,0),(a3*r3*fmpq(1,8),1,1),(a3*r3*r4*fmpq(1,80),2,2),(a3*r3*r4*r5*fmpq(1,960),3,3),(a3*r3*r4*r5*r6*fmpq(1,13440),4,4))
    b=row_corner(mb,bmask,one,reduced=True)
    c=row_corner(mc,cmask,one,reduced=True)
    base=balanced_batched_sum((scaled_bilinear(a,a,A2_TERMS,n,a2),scaled_bilinear(a,b,L2_TERMS,n,a2),scaled_bilinear(a,c,L2_TERMS,n,a2),scaled_bilinear(b,c,K2_TERMS,n,a2)),batch_size=4)
    pa4=((-2,a,1),(-2,a,2),(-5,a,3),(-12,c,2))
    pa5=((1,a,1),(-5,a,2),(7,c,1))
    pb4=((-2,a,1),(-2,a,2),(-5,a,3),(-12,b,2))
    pb5=((1,a,1),(-5,a,2),(7,b,1))
    pw4=((-2,a,1),(-2,a,2),(-10,a,3),(1,b,1),(-5,b,2),(1,c,1),(-5,c,2))
    pw3neg=((-4,a,2),(-2,a,3),(-2,b,1),(-2,b,2),(-5,b,3),(-2,c,1),(-2,c,2),(-5,c,3))
    cap2=choose(n-1,2,one)
    cap3=choose(n-1,3,one)
    correction=balanced_batched_sum((
        scaled_linear(pa4,cap2,n,a2),scaled_linear(pa5,cap3,n,a2),
        scaled_linear(pb4,cap2,n,a2),scaled_linear(pb5,cap3,n,a2),
        scaled_linear(pw3neg,cap2,n,a2),scaled_linear(pw4,cap3,n,a2)),batch_size=8)
    return base+correction


def source_polynomial(ctx,chart,orientation,bmask,cmask):
    x,y,z,w,u0,u1,u2,u3,u4,h=ctx.gens();one=ctx.constant(1);n=19+h
    if chart=="low":
        small=7+(n-14)*x*fmpq(1,2);large=n-small+small*y;overlap=small*y;edge_cap=overlap
    else:
        small=n*(one+x)*fmpq(1,2);large=small+(n-small)*y;overlap=small+large-n;edge_cap=n-1
    if orientation=="B_le_C":mb,mc=small,large
    else:mb,mc=large,small
    source=scaled_source(n,mb,mc,edge_cap,z,w,(u0,u1,u2,u3,u4),bmask,cmask,one,use_linear_wedge_floor=(chart=="high"))
    omega_geometry="Omega=e^2*w/2" if chart=="low" else "Omega=(2e-N)+(e^2/2-(2e-N))*w"
    return source,{"geometry":f"N=19+h; {orientation}; {chart}; min order 7..N; e={'overlap' if chart=='low' else 'N-1'}*z; {omega_geometry}","orientation":orientation,"order_chart":chart,"B_mask":bmask,"C_mask":cmask,"positive_multiplier":"N^4*a2^4","safe_parent_cap":"all PA/PB/PW harmful losses paid at order H=N-1","simplex":"u0+...+u4=1","reduced_four_corner_mode":True}


def main():
    ap=argparse.ArgumentParser();ap.add_argument("--order-chart",choices=("low","high"),required=True);ap.add_argument("--orientation",choices=("B_le_C","B_ge_C"),required=True);ap.add_argument("--b-mask",type=int,choices=(0,1),required=True);ap.add_argument("--c-mask",type=int,choices=(0,1),required=True);ap.add_argument("--inspect-only",action="store_true");ap.add_argument("--start-beta",type=int,default=0);ap.add_argument("--max-betas",type=int,default=1000000);ap.add_argument("--chunk-columns",type=int,default=4096);args=ap.parse_args();assert sha256(REDUCTION)==REDUCTION_SHA256
    names=("x","y","z","w","u0","u1","u2","u3","u4","h");ctx=fmpq_mpoly_ctx.get(names,"degrevlex");source,meta=source_polynomial(ctx,args.order_chart,args.orientation,args.b_mask,args.c_mask);terms=list(source.terms());coefctx=fmpq_mpoly_ctx.get(("x","y","z","w","h"),"degrevlex");degree,betas,coeffs,grouped=split_simplex(source,coefctx,4,1)
    summary={**meta,"source_terms":len(terms),"source_degrees":{name:int(max(m[axis] for m,_ in terms)) for axis,name in enumerate(names)},"simplex_degree":degree,"raw_simplex_monomials":grouped,"homogeneous_simplex_coefficients":len(betas)};print(json.dumps(summary,indent=2,sort_keys=True),flush=True)
    if args.inspect_only:print(MARKER+"_INSPECT_ONLY");return
    stop=min(len(betas),args.start_beta+args.max_betas);targetctx=fmpq_mpoly_ctx.get(("x","y","z","w","H"),"degrevlex");records=[];digest=hashlib.sha256()
    for index in range(args.start_beta,stop):
        mapped,dh,ct=compactify_one(coeffs[index],targetctx,4);degrees,values,replay=tensor_bernstein_from_flint_matrix(mapped,5,chunk_columns=args.chunk_columns);assert replay==len(list(mapped.terms()));minimum=min(values.flat);record={"beta_index":index,"beta":betas[index],"coefficient_terms":ct,"compactification_degree_h":dh,"bernstein_degrees":list(map(int,degrees)),"bernstein_coefficients":int(values.size),"negative":sum(v<0 for v in values.flat),"zero":sum(v==0 for v in values.flat),"minimum":str(minimum)};records.append(record);digest.update(json.dumps(record,separators=(",",":"),sort_keys=True).encode());print(json.dumps(record,sort_keys=True),flush=True)
    report={"marker":MARKER,**summary,"start_beta":args.start_beta,"stop_beta":stop,"processed_betas":len(records),"negative_betas":sum(r["negative"]>0 for r in records),"ordered_record_sha256":digest.hexdigest().upper(),"records":records,"scope":"N>=19 adjacent marks, ordinary parent adjacent to neither; both induced orders >=7; one chart/orientation/corner","reduction_report_sha256":REDUCTION_SHA256,"source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()};out=HERE/f"iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_{args.orientation}_{args.order_chart}_B{args.b_mask}_C{args.c_mask}_beta{args.start_beta}_{stop}_flint_rank7_g5_finish_20260831.json";raw=json.dumps(report,indent=2,sort_keys=True)+"\n";out.write_text(raw,encoding="utf-8",newline="\n");print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)


if __name__=="__main__":main()
