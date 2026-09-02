#!/usr/bin/env python3
"""Representative exact Bernstein branch for the shared-A-p nonadjacent lower."""

from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
from flint import fmpq,fmpq_mpoly_ctx
from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose,sha256
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS,K2_TERMS,L2_TERMS,compactify_one,row_corner,scaled_bilinear,split_simplex
from probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root import d_coarse_corner_row

HERE=Path(__file__).resolve().parent
REDUCTION=HERE/"iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_safe_cap_exact_rank7_g5_finish_20260831.json"
REDUCTION_SHA256="DDCF16EA392A2D351028EB0282DD4001BD649E26B58A89848A3DF3BF049CE2AD"
MARKER="PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_COMMON0_LOW_FLINT_RANK7_G5_FINISH"
MAX_N_DEN=MAX_A2_DEN=4

def scaled_linear(terms,cap,n,a2):
    return balanced_batched_sum((coef*cap*row[rank][0]*n**(MAX_N_DEN-row[rank][1])*a2**(MAX_A2_DEN-row[rank][2]) for coef,row,rank in terms),batch_size=32)

def build_source(ctx,bmask,cmask,d2mask):
    x,y,z,w,u0,u1,u2,u3,u4,h=ctx.gens();one=ctx.constant(1);n=22+h
    mb=7+(n-14)*x*fmpq(1,2);mc=n-mb+mb*y;delta=mb*y
    edges=(delta+1)*z;omega=edges**2*w*fmpq(1,2);a2=choose(n,2,one)-edges;a3=choose(n,3,one)-edges*(n-2)+omega;budget=6*n*a3-4*n*a2
    r3=3*n*a2+budget*(u0+u1+u2+u3);r4=2*n*a2+budget*(u0+u1+u2);r5=n*a2+budget*(u0+u1);r6=budget*u0
    a=((one,0,0),(n,0,0),(a2,0,0),(a3,0,0),(a3*r3*fmpq(1,8),1,1),(a3*r3*r4*fmpq(1,80),2,2),(a3*r3*r4*r5*fmpq(1,960),3,3),(a3*r3*r4*r5*r6*fmpq(1,13440),4,4))
    b=row_corner(mb,bmask,one,reduced=True);c=row_corner(mc,cmask,one,reduced=True);d=d_coarse_corner_row(delta,d2mask,one)
    base=balanced_batched_sum((scaled_bilinear(a,a,A2_TERMS,n,a2),scaled_bilinear(a,b,L2_TERMS,n,a2),scaled_bilinear(a,c,L2_TERMS,n,a2),scaled_bilinear(b,c,K2_TERMS,n,a2),scaled_bilinear(a,d,K2_TERMS,n,a2)),batch_size=5)
    pa4=((-2,a,1),(-2,a,2),(-5,a,3),(-12,c,2));pa5=((1,a,1),(-5,a,2),(7,c,1));pb4=((-2,a,1),(-2,a,2),(-5,a,3),(-12,b,2));pb5=((1,a,1),(-5,a,2),(7,b,1))
    pw3neg=((-4,a,2),(-2,a,3),(-2,b,1),(-2,b,2),(-5,b,3),(-2,c,1),(-2,c,2),(-5,c,3),(-12,d,2));pw4=((-2,a,1),(-2,a,2),(-10,a,3),(1,b,1),(-5,b,2),(1,c,1),(-5,c,2),(7,d,1));pz5=((-12,a,2),)
    correction=balanced_batched_sum((scaled_linear(pa4,choose(mb-1,2,one),n,a2),scaled_linear(pa5,choose(mb-1,3,one),n,a2),scaled_linear(pb4,choose(mc-1,2,one),n,a2),scaled_linear(pb5,choose(mc-1,3,one),n,a2),scaled_linear(pw3neg,choose(n-1,2,one),n,a2),scaled_linear(pw4,choose(n-1,3,one),n,a2),scaled_linear(pz5,choose(delta-1,2,one),n,a2)),batch_size=8)
    return base+correction,{"geometry":"common0 low","parameterization":"N=22+h; mB=7+(N-14)x/2; d=mB*y; mC=N-mB+d; e=(d+1)z; Omega=e^2*w/2","B_mask":bmask,"C_mask":cmask,"D2_mask":d2mask,"positive_multiplier":"N^4*a2^4","shared_A_minus_p_caps":True,"ordinary_lower_sha256":"E27665FFF4F0766F63D345EA2B8041BF4CA13CF9F3F9A846FD7C6C296FD6689C"}

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--b-mask",type=int,choices=(0,1),default=0);ap.add_argument("--c-mask",type=int,choices=(0,1),default=0);ap.add_argument("--d2-mask",type=int,choices=(0,1),default=0);ap.add_argument("--inspect-only",action="store_true");ap.add_argument("--chunk-columns",type=int,default=4096);args=ap.parse_args();assert sha256(REDUCTION)==REDUCTION_SHA256
    names=("x","y","z","w","u0","u1","u2","u3","u4","h");ctx=fmpq_mpoly_ctx.get(names,"degrevlex");source,meta=build_source(ctx,args.b_mask,args.c_mask,args.d2_mask);terms=list(source.terms());coefctx=fmpq_mpoly_ctx.get(("x","y","z","w","h"),"degrevlex");degree,betas,coeffs,grouped=split_simplex(source,coefctx,4,1);summary={**meta,"source_terms":len(terms),"source_degrees":{name:int(max(m[i] for m,_ in terms)) for i,name in enumerate(names)},"simplex_degree":degree,"raw_simplex_monomials":grouped,"homogeneous_simplex_coefficients":len(betas)};print(json.dumps(summary,indent=2,sort_keys=True),flush=True)
    if args.inspect_only:print(MARKER+"_INSPECT_ONLY");return
    targetctx=fmpq_mpoly_ctx.get(("x","y","z","w","H"),"degrevlex");records=[];digest=hashlib.sha256()
    for index in range(len(betas)):
        mapped,dh,ct=compactify_one(coeffs[index],targetctx,4);degrees,values,replay=tensor_bernstein_from_flint_matrix(mapped,5,chunk_columns=args.chunk_columns);assert replay==len(list(mapped.terms()));minimum=min(values.flat);record={"beta_index":index,"beta":betas[index],"coefficient_terms":ct,"compactification_degree_h":dh,"bernstein_degrees":list(map(int,degrees)),"bernstein_coefficients":int(values.size),"negative":sum(q<0 for q in values.flat),"zero":sum(q==0 for q in values.flat),"minimum":str(minimum)};records.append(record);digest.update(json.dumps(record,separators=(",",":"),sort_keys=True).encode());print(json.dumps(record,sort_keys=True),flush=True)
    report={"marker":MARKER,**summary,"records":records,"processed_betas":len(records),"negative_betas":sum(r["negative"]>0 for r in records),"negative_controls":sum(r["negative"] for r in records),"zero_controls":sum(r["zero"] for r in records),"minimum":str(min(__import__('fractions').Fraction(r["minimum"]) for r in records)),"tensor_bernstein_coefficients":sum(r["bernstein_coefficients"] for r in records),"ordered_record_sha256":digest.hexdigest().upper(),"scope":"representative common0/low/corner branch only; not a universal nonadjacent theorem","reduction_report_sha256":REDUCTION_SHA256,"source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()};out=HERE/f"iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_common0_low_B{args.b_mask}_C{args.c_mask}_D2{args.d2_mask}_flint_rank7_g5_finish_20260831.json";raw=json.dumps(report,indent=2,sort_keys=True)+"\n";out.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"negative_controls":report["negative_controls"],"minimum":report["minimum"],"tensor":report["tensor_bernstein_coefficients"]},indent=2,sort_keys=True));print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
