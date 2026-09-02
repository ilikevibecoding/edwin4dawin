#!/usr/bin/env python3
"""Bounded exact producer for both distinct strong grade-16 faces.

Strong rows use full convolution C for their curvature margin and the
oriented tail convolution V only in derivative terms.  At grade 16 exactly
the base and linear pieces survive.  Faces are computed sequentially and row
pieces are ordered-merged without materializing either completed row.
"""
from __future__ import annotations
import argparse,gc,hashlib,json,math
from pathlib import Path
from flint import fmpz_mpoly_ctx
from probe_rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_agent import FO,ap_add,ap_mul,zero_pair,private_bytes,guard,sha256,atomic_json,key

HERE=Path(__file__).resolve().parent
DEPENDENCY=("probe_rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_agent.py","D408E1A73F202934652BDC19C830AD3C6BC3D826E79080F4B5798DDF448261E4")
CANONICAL=("probe_rank8_low_low_a23_mixed_cross_face_grade_outer_stream_agent.py","BF0F79B2A7C1F35FBBFD350601421914C71648557BF1B6E41E38F3C1C75077DC")
BASE=("h","ta","tb","P","Q"); REDUCED=("a0","b4","b5","b6","b7","a4","a5","a6","a7"); NAMES=BASE+REDUCED; FULL=NAMES+("b0",); GA=tuple(NAMES.index(x) for x in REDUCED[:5]); GB=tuple(NAMES.index(x) for x in REDUCED[5:]); FACES=(("01",(0,1)),("10",(1,0))); LABELS=(("strong_middle_times_4",4,2),("strong_far",1,1)); DEGREE=16; LIMIT=475_000_000; FAILURE={}

def build(face,context,peak,limit):
    raw=dict(zip(NAMES,context.gens())); zero=context.constant(0); one=context.constant(1); b={name:FO(zero,raw[name]) for name in BASE}; s={name:FO(raw[name],zero) for name in REDUCED}; h,ta,tb,P,Q=(b[name] for name in BASE); z,w=face; a2=(1-z)*P; a3=z*P; b2=(1-w)*Q; b3=w*Q
    gaps=[2*h+s["a0"],h,h+a2,h+a3,h+s["a4"],h+s["a5"],h+s["a6"],h+s["a7"]]; lr=[None]*9; lr[8]=ta
    for i in range(7,-1,-1): lr[i]=lr[i+1]+gaps[i]
    left=[FO(one,zero)]
    for ratio in lr: left.append(left[-1]*ratio)
    tail=[FO(zero,zero),FO(zero,zero),FO(zero,zero)]+left[3:]; capacity=lr[2]
    rg=[2*h,h,h+b2,h+b3,h+s["b4"],h+s["b5"],h+s["b6"],h+s["b7"]]; rr=[None]*9; rr[8]=(tb,FO(zero,zero))
    for i in range(7,-1,-1): rr[i]=ap_add(rr[i+1],(rg[i],FO(one,zero) if i==0 else FO(zero,zero)))
    right=[(FO(one,zero),FO(zero,zero))]
    for ratio in rr: right.append(ap_mul(right[-1],ratio))
    direction=[zero_pair(zero) for _ in range(10)]; direction[3]=(right[2][0]*h,right[2][1]*h)
    for rank in range(4,10): direction[rank]=ap_mul(direction[rank-1],rr[rank-1])
    for pair in direction:
        assert not pair[0].z and not pair[1].z  # direction already carries explicit h
    c={};v={};dc={};dv={}
    for rank in (7,8,9):
        cp=zero_pair(zero);vp=zero_pair(zero);dcp=zero_pair(zero);dvp=zero_pair(zero)
        for i in range(rank+1):
            wgt=math.comb(rank,i); cp=ap_add(cp,(wgt*left[i]*right[rank-i][0],wgt*left[i]*right[rank-i][1])); vp=ap_add(vp,(wgt*tail[i]*right[rank-i][0],wgt*tail[i]*right[rank-i][1])); dcp=ap_add(dcp,(wgt*left[i]*direction[rank-i][0],wgt*left[i]*direction[rank-i][1])); dvp=ap_add(dvp,(wgt*tail[i]*direction[rank-i][0],wgt*tail[i]*direction[rank-i][1]))
        c[rank]=cp;v[rank]=vp;dc[rank]=dcp;dv[rank]=dvp;guard(f"strong16 face{face} C/V/DC/DV rank{rank}",peak,limit)
    return raw,h,capacity,c,v,dc,dv
def product(x,y,e,zero):
    result=FO(zero,zero)
    for i in range(2):
        j=e-i
        if 0<=j<2: result+=x[i]*y[j]
    return result
def curvature(values,e,h,zero): return product(values[8],values[8],e,zero)-product(values[7],values[9],e,zero)-h*product(values[7],values[8],e,zero)
def cross(base,direction,e,h,zero): return 2*product(base[8],direction[8],e,zero)-product(base[7],direction[9],e,zero)-product(direction[7],base[9],e,zero)-h*(product(base[7],direction[8],e,zero)+product(direction[7],base[8],e,zero))
def derivative(c,v,e,h,zero): return 2*product(c[8],v[8],e,zero)-product(v[7],c[9],e,zero)-product(c[7],v[9],e,zero)-h*(product(v[7],c[8],e,zero)+product(c[7],v[8],e,zero))
def pieces(raw,h,capacity,c,v,dc,dv,e,peak,limit):
    zero=next(iter(raw.values())).context().constant(0); base=(capacity*curvature(c,e,h,zero)+h*derivative(c,v,e,h,zero)).o; guard(f"strong16 base outer{e}",peak,limit)
    # h*derivative_cross has base degree at least two (direction already has h)
    # and is exactly zero in this first-base-degree grade16 projection.
    linear=(capacity*cross(c,dc,e,h,zero)).o; guard(f"strong16 linear outer{e}",peak,limit); return base,linear
def merge(base,linear,outer,complete,peak,limit):
    polys=[base,linear]; indices=[0,0]; current=[key(polys[i],0) if len(polys[i]) else None for i in range(2)]; stats={label:{"outer_exponent":outer,"mixed_support_terms":0,"negative_terms":0,"minimum":None,"first_negative":None,"ordered_coefficient_sha256":None} for label,_,_ in LABELS}; dig={label:hashlib.sha256() for label,_,_ in LABELS}; raw=0; previous=None
    while any(x is not None for x in current):
        active=[i for i,x in enumerate(current) if x is not None]; k=min(current[i][0] for i in active); mon=None; coeff=[0,0]
        for i in active:
            if current[i][0]==k:
                _,m,c=current[i]; mon=m if mon is None else mon; assert mon==m; coeff[i]=c; indices[i]+=1; current[i]=key(polys[i],indices[i]) if indices[i]<len(polys[i]) else None
        if previous is not None: assert previous<=k
        previous=k;raw+=1;assert sum(mon[:5])==1 and sum(mon[5:])+outer==DEGREE
        if not any(mon[i] for i in GA): continue
        if outer==0 and not any(mon[i] for i in GB): continue
        full=mon+(outer,);prefix=",".join(map(str,full))+":"
        for label,bs,ls in LABELS:
            coefficient=bs*coeff[0]+ls*coeff[1]
            if not coefficient: continue
            enc=(prefix+str(coefficient)+"\n").encode();dig[label].update(enc);complete[label].update(enc);s=stats[label];s["mixed_support_terms"]+=1;s["minimum"]=coefficient if s["minimum"] is None else min(s["minimum"],coefficient)
            if coefficient<0:
                s["negative_terms"]+=1
                if s["first_negative"] is None:s["first_negative"]={"monomial":list(full),"coefficient":coefficient}
        if raw%100000==0:print("STRONG16 MERGE OUTER",outer,"RAW",raw,"PRIVATE",private_bytes(),flush=True);guard(f"strong16 merge outer{outer} raw{raw}",peak,limit)
    for label in stats:stats[label]["ordered_coefficient_sha256"]=dig[label].hexdigest().upper();stats[label]["unfiltered_union_terms"]=raw
    return stats
def artifacts(output,token,face,label,stats,complete,source,peak,limit):
    prefix=output/f"rank8_low_low_a23_mixed_cross_face_{token}_{label}_grade_16_outer_stream_agent_20260823";chunks=[]
    for stat in stats:
        path=Path(str(prefix)+f"_b0_exp_{stat['outer_exponent']}.json");payload={"schema":"rank8-low-low-a23-mixed-cross-strong-grade16-c-v-piece-merge-chunk-agent-v1","status":"PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE" if stat["negative_terms"]==0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT","face":list(face),"bridge_corner":[2*face[0],2*face[1]],"family":"strong","auxiliary":label,"total_ordinary_slack_degree":DEGREE,"outer_variable":"b0","outer_exponent":stat["outer_exponent"],"canonical_scope":{"margin_uses_full_C":True,"derivative_uses_oriented_tail_V":True,"surviving_pieces":["base","linear"],"direction_excluded":True},"chunk":stat,"source_sha256":source,"canonical_source":{"path":CANONICAL[0],"sha256":CANONICAL[1]}};digest=atomic_json(path,payload);chunks.append({"outer_exponent":stat["outer_exponent"],"path":str(path.resolve()),"sha256":digest,"mixed_support_terms":stat["mixed_support_terms"],"negative_terms":stat["negative_terms"],"minimum":stat["minimum"],"ordered_coefficient_sha256":stat["ordered_coefficient_sha256"]})
    total=sum(x["mixed_support_terms"] for x in chunks);neg=sum(x["negative_terms"] for x in chunks);manifest={"schema":"rank8-low-low-a23-mixed-cross-strong-grade16-c-v-piece-merge-manifest-agent-v1","status":"PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE" if neg==0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT","face":list(face),"bridge_corner":[2*face[0],2*face[1]],"family":"strong","auxiliary":label,"total_ordinary_slack_degree":DEGREE,"outer_variable":"b0","outer_exponent_range":[0,2],"canonical_scope":{"margin_uses_full_C":True,"derivative_uses_oriented_left_tail_V":True,"surviving_pieces":["base","linear"],"direction_piece_excluded_by_degree":True,"faces_computed_separately":True},"hard_private_memory_limit_bytes":limit,"observed_peak_private_bytes_at_checkpoints":peak[0],"result":{"chunks":chunks,"mixed_support_terms":total,"negative_terms":neg,"ordered_coefficient_sha256":complete.hexdigest().upper(),"piece_names":["base","linear"],"piece_scales":[4,2] if label.endswith("middle_times_4") else [1,1]},"source_sha256":source,"dependency":{"path":DEPENDENCY[0],"sha256":DEPENDENCY[1]}};path=Path(str(prefix)+"_manifest.json");digest=atomic_json(path,manifest);return {"face_token":token,"face":list(face),"auxiliary":label,"manifest":str(path.resolve()),"manifest_sha256":digest,"mixed_support_terms":total,"negative_terms":neg,"ordered_coefficient_sha256":manifest["result"]["ordered_coefficient_sha256"]}
def main():
    p=argparse.ArgumentParser();p.add_argument("--output-directory",default=".");p.add_argument("--private-limit",type=int,default=LIMIT);a=p.parse_args();output=Path(a.output_directory).resolve();output.mkdir(parents=True,exist_ok=True);assert sha256(HERE/DEPENDENCY[0])==DEPENDENCY[1] and sha256(HERE/CANONICAL[0])==CANONICAL[1];source=sha256(Path(__file__));peak=[0];cells=[]
    for token,face in FACES:
        FAILURE["face_token"]=token;context=fmpz_mpoly_ctx.get(NAMES,"degrevlex");raw,h,capacity,c,v,dc,dv=build(face,context,peak,a.private_limit);complete={label:hashlib.sha256() for label,_,_ in LABELS};replays={label:[] for label,_,_ in LABELS}
        for outer in (0,1,2):
            FAILURE["outer_exponent"]=outer
            base,linear=pieces(raw,h,capacity,c,v,dc,dv,outer,peak,a.private_limit);stats=merge(base,linear,outer,complete,peak,a.private_limit)
            for label,_,_ in LABELS:replays[label].append(stats[label]);print("FACE",token,"ROW",label,"OUTER",outer,"TERMS",stats[label]["mixed_support_terms"],"NEG",stats[label]["negative_terms"],"MIN",stats[label]["minimum"],flush=True)
            del base,linear;gc.collect();guard(f"strong16 released face{token} outer{outer}",peak,a.private_limit)
        cells.extend(artifacts(output,token,face,label,replays[label],complete[label],source,peak,a.private_limit) for label,_,_ in LABELS);del raw,h,capacity,c,v,dc,dv;gc.collect();del context;gc.collect();guard(f"strong16 released face{token}",peak,a.private_limit)
    passed=len(cells)==4 and all(x["negative_terms"]==0 for x in cells);job={"schema":"rank8-low-low-a23-mixed-cross-strong-grade16-c-v-piece-merge-job-agent-v1","status":"PASS_EXACT_DISTINCT_FACES_GRADE16_STRONG_C_V_BASE_LINEAR_ROWS_NONNEGATIVE" if passed else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT","completed_cells":cells,"canonical_scope":{"margin_uses_full_C":True,"derivative_uses_oriented_left_tail_V":True,"surviving_pieces":["base","linear"],"direction_excluded":True,"faces_separate":True},"exact_mixed_support_universe_bound_per_row":{"outer_0":3648285,"outer_1":2447490,"outer_2":1595450,"total":7691225},"hard_private_memory_limit_bytes":a.private_limit,"observed_peak_private_bytes_at_checkpoints":peak[0],"source_sha256":source,"dependency":{"path":DEPENDENCY[0],"sha256":DEPENDENCY[1]}};path=output/"rank8_low_low_a23_mixed_cross_strong_grade16_c_v_piece_merge_job_agent_20260823.json";print("JOB",path,atomic_json(path,job),job["status"],flush=True)
    if not passed:raise SystemExit(2)
if __name__=="__main__":
    try:main()
    except BaseException as exc:
        atomic_json(HERE/"rank8_low_low_a23_mixed_cross_strong_grade16_c_v_piece_merge_failure_agent_20260823.json",{"schema":"rank8-low-low-a23-mixed-cross-strong-grade16-c-v-piece-merge-failure-agent-v1","status":"FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP","exception_type":type(exc).__name__,"exception":str(exc),"context":FAILURE,"source_sha256":sha256(Path(__file__))});raise
