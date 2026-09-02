#!/usr/bin/env python3
"""Bounded exact producer for both distinct curvature grade-15 faces.

The canonical oriented tail V is expanded only through base degree one and
b0 degree two.  At slack grade 15 the curvature row contains the base and
linear pieces, but not the direction-square piece.  Base and linear
polynomials are merged as ordered FLINT streams, so neither complete row is
materialized.  Faces (0,1) and (1,0) are constructed sequentially and are not
identified.
"""
from __future__ import annotations
import argparse, ctypes, gc, hashlib, json, math, os
from ctypes import wintypes
from pathlib import Path
from flint import fmpz_mpoly_ctx

HERE=Path(__file__).resolve().parent
CANONICAL=("probe_rank8_low_low_a23_mixed_cross_face_grade_outer_stream_agent.py","BF0F79B2A7C1F35FBBFD350601421914C71648557BF1B6E41E38F3C1C75077DC")
NOTE=("RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md","BE056D1EAC7AD07EDB42BFDEE40873C949D32D24F3EC8912BD5B555D5E3B394E")
BASE=("h","ta","tb","P","Q"); REDUCED=("a0","b4","b5","b6","b7","a4","a5","a6","a7"); NAMES=BASE+REDUCED; FULL=NAMES+("b0",)
GA=tuple(NAMES.index(x) for x in ("a0","b4","b5","b6","b7")); GB=tuple(NAMES.index(x) for x in ("a4","a5","a6","a7"))
FACES=(("01",(0,1)),("10",(1,0))); LABELS=(("curvature_middle_times_4",4,2),("curvature_far",1,1)); DEGREE=15; LIMIT=475_000_000; FAILURE_CONTEXT={}
class PMC(ctypes.Structure):
    _fields_=[("cb",wintypes.DWORD),("PageFaultCount",wintypes.DWORD),("PeakWorkingSetSize",ctypes.c_size_t),("WorkingSetSize",ctypes.c_size_t),("QuotaPeakPagedPoolUsage",ctypes.c_size_t),("QuotaPagedPoolUsage",ctypes.c_size_t),("QuotaPeakNonPagedPoolUsage",ctypes.c_size_t),("QuotaNonPagedPoolUsage",ctypes.c_size_t),("PagefileUsage",ctypes.c_size_t),("PeakPagefileUsage",ctypes.c_size_t),("PrivateUsage",ctypes.c_size_t)]
def private_bytes():
    c=PMC(); c.cb=ctypes.sizeof(c); current=ctypes.windll.kernel32.GetCurrentProcess; current.restype=wintypes.HANDLE; query=ctypes.windll.psapi.GetProcessMemoryInfo; query.argtypes=(wintypes.HANDLE,ctypes.POINTER(PMC),wintypes.DWORD); query.restype=wintypes.BOOL
    if not query(current(),ctypes.byref(c),c.cb): raise OSError("GetProcessMemoryInfo failed")
    return int(c.PrivateUsage)
def guard(stage,peak,limit):
    current=private_bytes(); peak[0]=max(peak[0],current); FAILURE_CONTEXT.update(stage=stage,private_bytes=current,peak_private_bytes=peak[0])
    if current>=limit: raise MemoryError(f"private-memory guard {stage}: {current} >= {limit}")
def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()
def atomic_json(path,payload):
    path=Path(path); temporary=path.with_suffix(path.suffix+".tmp"); temporary.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8"); os.replace(temporary,path); return sha256(path)

class FO:
    """Polynomial truncated to base degree zero and one."""
    __slots__=("z","o")
    def __init__(self,z,o): self.z=z; self.o=o
    def __add__(self,other):
        if not isinstance(other,FO): other=FO(other,self.z.context().constant(0))
        return FO(self.z+other.z,self.o+other.o)
    __radd__=__add__
    def __neg__(self): return FO(-self.z,-self.o)
    def __sub__(self,other): return self+(-other)
    def __mul__(self,other):
        if not isinstance(other,FO): return FO(self.z*other,self.o*other)
        return FO(self.z*other.z,self.z*other.o+self.o*other.z)
    __rmul__=__mul__

def ap_add(x,y): return (x[0]+y[0],x[1]+y[1])
def ap_mul(x,y):
    # Every row product contains the unique b0-bearing ratio at most once.
    assert (not x[1].z and not x[1].o) or (not y[1].z and not y[1].o)
    return (x[0]*y[0],x[0]*y[1]+x[1]*y[0])
def zero_pair(zero): return (FO(zero,zero),FO(zero,zero))

def build_common(face,context,peak,limit):
    raw=dict(zip(NAMES,context.gens())); zero=context.constant(0); one=context.constant(1)
    base={name:FO(zero,raw[name]) for name in BASE}; slack={name:FO(raw[name],zero) for name in REDUCED}
    h,ta,tb,P,Q=(base[name] for name in BASE); z,w=face; a2=(1-z)*P; a3=z*P; b2=(1-w)*Q; b3=w*Q
    lg=[2*h+slack["a0"],h,h+a2,h+a3,h+slack["a4"],h+slack["a5"],h+slack["a6"],h+slack["a7"]]
    lr=[None]*9; lr[8]=ta
    for i in range(7,-1,-1): lr[i]=lr[i+1]+lg[i]
    left=[FO(one,zero)]
    for ratio in lr: left.append(left[-1]*ratio)
    tail=[FO(zero,zero),FO(zero,zero),FO(zero,zero)]+left[3:]
    assert len(tail)==10 and tail[3].z==left[3].z and tail[3].o==left[3].o

    # Right ratios/row are affine in the factored outer variable b0.
    rg0=[2*h,h,h+b2,h+b3,h+slack["b4"],h+slack["b5"],h+slack["b6"],h+slack["b7"]]
    rr=[None]*9; rr[8]=(tb,FO(zero,zero))
    for i in range(7,-1,-1):
        gap=(rg0[i],FO(one,zero) if i==0 else FO(zero,zero)); rr[i]=ap_add(rr[i+1],gap)
    right=[(FO(one,zero),FO(zero,zero))]
    for ratio in rr: right.append(ap_mul(right[-1],ratio))
    direction=[zero_pair(zero) for _ in range(10)]
    direction[3]=(right[2][0]*h,right[2][1]*h)
    for rank in range(4,10): direction[rank]=ap_mul(direction[rank-1],rr[rank-1])
    for pair in direction:
        assert not pair[0].z and not pair[1].z  # direction already carries explicit h
    v={}; dv={}
    for rank in (7,8,9):
        vp=zero_pair(zero); dp=zero_pair(zero)
        for i in range(rank+1):
            weight=math.comb(rank,i); vp=ap_add(vp,(weight*tail[i]*right[rank-i][0],weight*tail[i]*right[rank-i][1])); dp=ap_add(dp,(weight*tail[i]*direction[rank-i][0],weight*tail[i]*direction[rank-i][1]))
        v[rank]=vp; dv[rank]=dp; guard(f"face{face} canonical V/DV rank{rank}",peak,limit)
    return raw,v,dv

def top_product(x,y,e,zero):
    result=zero
    for i in range(2):
        j=e-i
        if 0<=j<2: result+=x[i].z*y[j].z
    return result
def first_product(x,y,e,zero):
    result=zero
    for i in range(2):
        j=e-i
        if 0<=j<2: result+=x[i].z*y[j].o+x[i].o*y[j].z
    return result
def pieces(raw,v,dv,e,peak,limit):
    zero=next(iter(raw.values())).context().constant(0); h=raw["h"]
    base=first_product(v[8],v[8],e,zero); guard(f"base e{e} square first",peak,limit)
    other=first_product(v[7],v[9],e,zero); guard(f"base e{e} cross first",peak,limit); base-=other; del other; gc.collect()
    other=h*top_product(v[7],v[8],e,zero); guard(f"base e{e} explicit h",peak,limit); base-=other; del other; gc.collect()
    linear=2*first_product(v[8],dv[8],e,zero); guard(f"linear e{e} first",peak,limit)
    other=first_product(v[7],dv[9],e,zero); guard(f"linear e{e} second",peak,limit); linear-=other; del other; gc.collect()
    other=first_product(dv[7],v[9],e,zero); guard(f"linear e{e} third",peak,limit); linear-=other; del other; gc.collect()
    # The explicit -h terms of canonical cross have base degree >=2 here and
    # vanish in this exact base-degree-one projection.
    guard(f"face pieces outer{e}",peak,limit); return base,linear

def key(poly,index):
    mon=tuple(map(int,poly.monomial(index))); return (-sum(mon),tuple(reversed(mon))),mon,int(poly.coefficient(index))
def merge_rows(base,linear,outer,complete,peak,limit):
    indices=[0,0]; polys=[base,linear]; current=[key(polys[i],0) if len(polys[i]) else None for i in range(2)]
    stats={label:{"outer_exponent":outer,"mixed_support_terms":0,"negative_terms":0,"minimum":None,"first_negative":None,"ordered_coefficient_sha256":None} for label,_,_ in LABELS}; digests={label:hashlib.sha256() for label,_,_ in LABELS}; raw_union=0; previous=None
    while any(item is not None for item in current):
        active=[i for i,item in enumerate(current) if item is not None]; next_key=min(current[i][0] for i in active); monomial=None; coeffs=[0,0]
        for i in active:
            if current[i][0]==next_key:
                _,mon,coef=current[i]; monomial=mon if monomial is None else monomial; assert monomial==mon; coeffs[i]=coef; indices[i]+=1; current[i]=key(polys[i],indices[i]) if indices[i]<len(polys[i]) else None
        if previous is not None: assert previous<=next_key
        previous=next_key; raw_union+=1; assert sum(monomial[:len(BASE)])==1 and sum(monomial[len(BASE):])+outer==DEGREE
        if not any(monomial[i] for i in GA): continue
        if outer==0 and not any(monomial[i] for i in GB): continue
        full=monomial+(outer,); prefix=",".join(map(str,full))+":"
        for label,base_scale,linear_scale in LABELS:
            coefficient=base_scale*coeffs[0]+linear_scale*coeffs[1]
            if coefficient==0: continue
            encoded=(prefix+str(coefficient)+"\n").encode(); digests[label].update(encoded); complete[label].update(encoded); stat=stats[label]; stat["mixed_support_terms"]+=1; stat["minimum"]=coefficient if stat["minimum"] is None else min(stat["minimum"],coefficient)
            if coefficient<0:
                stat["negative_terms"]+=1
                if stat["first_negative"] is None: stat["first_negative"]={"monomial":list(full),"coefficient":coefficient}
        if raw_union%100000==0: print("MERGE OUTER",outer,"RAW",raw_union,"PRIVATE",private_bytes(),flush=True); guard(f"merge outer{outer} raw{raw_union}",peak,limit)
    for label in stats: stats[label]["ordered_coefficient_sha256"]=digests[label].hexdigest().upper(); stats[label]["unfiltered_union_terms"]=raw_union
    return stats

def write_chunk(output,token,face,label,stat,source,peak,limit):
    prefix=output/f"rank8_low_low_a23_mixed_cross_face_{token}_{label}_grade_15_outer_stream_agent_20260823"; path=Path(str(prefix)+f"_b0_exp_{stat['outer_exponent']}.json")
    payload={"schema":"rank8-low-low-a23-mixed-cross-curvature-grade15-tail-v-piece-merge-chunk-agent-v1","status":"PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE" if stat["negative_terms"]==0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT","face":list(face),"bridge_corner":[2*face[0],2*face[1]],"family":"curvature","auxiliary":label,"total_ordinary_slack_degree":DEGREE,"outer_variable":"b0","outer_exponent":stat["outer_exponent"],"outer_support_bound":[0,2],"variables":list(FULL),"canonical_convolution":"oriented left tail V","surviving_pieces":["base","linear"],"excluded_piece":"direction (maximum slack degree 14)","chunk":stat,"source_sha256":source,"canonical_source":{"path":CANONICAL[0],"sha256":CANONICAL[1]}}
    digest=atomic_json(path,payload); return {"outer_exponent":stat["outer_exponent"],"path":str(path.resolve()),"sha256":digest,"mixed_support_terms":stat["mixed_support_terms"],"negative_terms":stat["negative_terms"],"minimum":stat["minimum"],"ordered_coefficient_sha256":stat["ordered_coefficient_sha256"]}
def finish_manifest(output,token,face,label,chunks,complete,source,peak,limit):
    prefix=output/f"rank8_low_low_a23_mixed_cross_face_{token}_{label}_grade_15_outer_stream_agent_20260823"; total=sum(x["mixed_support_terms"] for x in chunks); negatives=sum(x["negative_terms"] for x in chunks)
    payload={"schema":"rank8-low-low-a23-mixed-cross-curvature-grade15-tail-v-piece-merge-manifest-agent-v1","status":"PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE" if negatives==0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT","face":list(face),"bridge_corner":[2*face[0],2*face[1]],"family":"curvature","auxiliary":label,"total_ordinary_slack_degree":DEGREE,"outer_variable":"b0","outer_exponent_range":[0,2],"global_row_assembly":False,"canonical_scope":{"oriented_left_tail_V":True,"full_convolution_C_excluded":True,"surviving_pieces":["base","linear"],"direction_piece_excluded_by_degree":True,"faces_computed_separately":True},"hard_private_memory_limit_bytes":limit,"observed_peak_private_bytes_at_checkpoints":peak[0],"result":{"chunks":chunks,"mixed_support_terms":total,"negative_terms":negatives,"ordered_coefficient_sha256":complete.hexdigest().upper(),"piece_names":["base","linear"],"piece_scales":[4,2] if label.endswith("middle_times_4") else [1,1]},"source_sha256":source,"canonical_source":{"path":CANONICAL[0],"sha256":CANONICAL[1]},"theoretical_note":{"path":NOTE[0],"sha256":NOTE[1]}}
    path=Path(str(prefix)+"_manifest.json"); digest=atomic_json(path,payload); return {"face_token":token,"face":list(face),"auxiliary":label,"manifest":str(path.resolve()),"manifest_sha256":digest,"mixed_support_terms":total,"negative_terms":negatives,"ordered_coefficient_sha256":payload["result"]["ordered_coefficient_sha256"]}

def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--output-directory",default="."); parser.add_argument("--private-limit",type=int,default=LIMIT); args=parser.parse_args(); output=Path(args.output_directory).resolve(); output.mkdir(parents=True,exist_ok=True); assert sha256(HERE/CANONICAL[0])==CANONICAL[1] and sha256(HERE/NOTE[0])==NOTE[1]
    source=sha256(Path(__file__)); peak=[0]; cells=[]; face_reports=[]
    for token,face in FACES:
        FAILURE_CONTEXT.update(face_token=token); context=fmpz_mpoly_ctx.get(NAMES,"degrevlex"); raw,v,dv=build_common(face,context,peak,args.private_limit); complete={label:hashlib.sha256() for label,_,_ in LABELS}; chunks={label:[] for label,_,_ in LABELS}
        for outer in (0,1,2):
            FAILURE_CONTEXT["outer_exponent"]=outer; base,linear=pieces(raw,v,dv,outer,peak,args.private_limit); stats=merge_rows(base,linear,outer,complete,peak,args.private_limit)
            for label,_,_ in LABELS:
                chunks[label].append(write_chunk(output,token,face,label,stats[label],source,peak,args.private_limit)); print("FACE",token,"ROW",label,"OUTER",outer,"TERMS",stats[label]["mixed_support_terms"],"NEG",stats[label]["negative_terms"],"MIN",stats[label]["minimum"],flush=True)
            del base,linear; gc.collect(); guard(f"face{token} released outer{outer}",peak,args.private_limit)
        face_cells=[finish_manifest(output,token,face,label,chunks[label],complete[label],source,peak,args.private_limit) for label,_,_ in LABELS]; cells.extend(face_cells); face_reports.append({"face_token":token,"face":list(face),"cells":face_cells}); del raw,v,dv,context; gc.collect(); guard(f"released face{token}",peak,args.private_limit)
    passed=len(cells)==4 and all(x["negative_terms"]==0 for x in cells)
    job={"schema":"rank8-low-low-a23-mixed-cross-curvature-grade15-tail-v-piece-merge-job-agent-v1","status":"PASS_EXACT_DISTINCT_FACES_GRADE15_CURVATURE_BASE_LINEAR_ROWS_NONNEGATIVE" if passed else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT","total_ordinary_slack_degree":DEGREE,"completed_cells":cells,"face_reports":face_reports,"canonical_scope":{"oriented_left_tail_V":True,"full_convolution_C_excluded":True,"surviving_pieces":["base","linear"],"direction_excluded_by_degree_bound":True,"face_01_face_10_hash_reuse":False},"exact_mixed_support_universe_bound_per_row":{"outer_0":2428110,"outer_1":1595450,"outer_2":1014650,"total":5038210},"hard_private_memory_limit_bytes":args.private_limit,"observed_peak_private_bytes_at_checkpoints":peak[0],"source_sha256":source,"canonical_source":{"path":CANONICAL[0],"sha256":CANONICAL[1]}}
    path=output/"rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_job_agent_20260823.json"; digest=atomic_json(path,job); print("JOB",path,digest,job["status"],flush=True)
    if not passed: raise SystemExit(2)
if __name__=="__main__":
    try: main()
    except BaseException as exc:
        atomic_json(HERE/"rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_failure_agent_20260823.json",{"schema":"rank8-low-low-a23-mixed-cross-curvature-grade15-tail-v-piece-merge-failure-agent-v1","status":"FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP","exception_type":type(exc).__name__,"exception":str(exc),"context":FAILURE_CONTEXT,"source_sha256":sha256(Path(__file__))}); raise
