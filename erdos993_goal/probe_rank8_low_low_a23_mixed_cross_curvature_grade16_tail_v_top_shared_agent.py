#!/usr/bin/env python3
"""Correct shared producer for curvature grade 16 using the canonical tail V.

The canonical curvature auxiliary is formed from
V = ([0,0,0]+left[3:]) * right, not from the full convolution C.  At top
ordinary-slack degree 16, P,Q and all base variables vanish, so both endpoint
faces share V8^2-V7*V9 and the middle row is four times the far row.
"""
from __future__ import annotations
import argparse, ctypes, gc, hashlib, json, math, os
from ctypes import wintypes
from pathlib import Path
from flint import fmpz_mpoly_ctx

HERE=Path(__file__).resolve().parent
NOTE=("RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md","BE056D1EAC7AD07EDB42BFDEE40873C949D32D24F3EC8912BD5B555D5E3B394E")
CANONICAL=("probe_rank8_low_low_a23_mixed_cross_face_grade_outer_stream_agent.py","BF0F79B2A7C1F35FBBFD350601421914C71648557BF1B6E41E38F3C1C75077DC")
BASE=("h","ta","tb","P","Q")
REDUCED=("a0","b4","b5","b6","b7","a4","a5","a6","a7")
FULL=BASE+REDUCED+("b0",); GA=(0,1,2,3,4); GB=(5,6,7,8)
FACES=(("01",(0,1)),("10",(1,0)))
LABELS=(("curvature_middle_times_4",4),("curvature_far",1))
DEGREE=16; DEFAULT_LIMIT=475_000_000; FAILURE_CONTEXT={}

class PMC(ctypes.Structure):
    _fields_=[("cb",wintypes.DWORD),("PageFaultCount",wintypes.DWORD),("PeakWorkingSetSize",ctypes.c_size_t),("WorkingSetSize",ctypes.c_size_t),("QuotaPeakPagedPoolUsage",ctypes.c_size_t),("QuotaPagedPoolUsage",ctypes.c_size_t),("QuotaPeakNonPagedPoolUsage",ctypes.c_size_t),("QuotaNonPagedPoolUsage",ctypes.c_size_t),("PagefileUsage",ctypes.c_size_t),("PeakPagefileUsage",ctypes.c_size_t),("PrivateUsage",ctypes.c_size_t)]
def private_bytes():
    c=PMC(); c.cb=ctypes.sizeof(c); current=ctypes.windll.kernel32.GetCurrentProcess; current.restype=wintypes.HANDLE
    query=ctypes.windll.psapi.GetProcessMemoryInfo; query.argtypes=(wintypes.HANDLE,ctypes.POINTER(PMC),wintypes.DWORD); query.restype=wintypes.BOOL
    if not query(current(),ctypes.byref(c),c.cb): raise OSError("GetProcessMemoryInfo failed")
    return int(c.PrivateUsage)
def guard(stage,peak,limit):
    current=private_bytes(); peak[0]=max(peak[0],current); FAILURE_CONTEXT.update(stage=stage,private_bytes=current,peak_private_bytes=peak[0])
    if current>=limit: raise MemoryError(f"private-memory guard at {stage}: {current} >= {limit}")
def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()
def atomic_json(path,payload):
    path=Path(path); temporary=path.with_suffix(path.suffix+".tmp"); temporary.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8"); os.replace(temporary,path); return sha256(path)

def build_tail_convolutions(context,peak,limit):
    x=dict(zip(REDUCED,context.gens())); zero=context.constant(0); one=context.constant(1)
    A=x["a4"]+x["a5"]+x["a6"]+x["a7"]; A5=x["a5"]+x["a6"]+x["a7"]; A6=x["a6"]+x["a7"]
    B=x["b4"]+x["b5"]+x["b6"]+x["b7"]; B5=x["b5"]+x["b6"]+x["b7"]; B6=x["b6"]+x["b7"]
    left_ratios=[x["a0"]+A,A,A,A,A,A5,A6,x["a7"],zero]
    right_ratios=[(B,one),(B,zero),(B,zero),(B,zero),(B,zero),(B5,zero),(B6,zero),(x["b7"],zero),(zero,zero)]
    left=[one]
    for ratio in left_ratios: left.append(left[-1]*ratio)
    # This line is the canonical oriented curvature scope.
    tail=[zero,zero,zero]+left[3:]
    assert len(tail)==10 and not tail[0] and not tail[1] and not tail[2] and tail[3]==left[3]
    right=[(one,zero)]
    for r0,r1 in right_ratios:
        p0,p1=right[-1]; assert not p1 or not r1; right.append((p0*r0,p0*r1+p1*r0))
    assert len(left)==len(tail)==len(right)==10 and not tail[9] and not right[9][0] and not right[9][1]
    guard("canonical top tail rows",peak,limit)
    v={}
    for rank in (7,8,9):
        values=[]
        for outer in (0,1):
            value=zero
            for i in range(rank+1): value+=math.comb(rank,i)*tail[i]*right[rank-i][outer]
            values.append(value)
        v[rank]=tuple(values); guard(f"tail convolution V{rank}",peak,limit)
    return v

def slice_polynomial(v,outer,peak,limit):
    if outer==0:
        value=v[8][0]*v[8][0]; guard("v outer0 square",peak,limit); other=v[7][0]*v[9][0]; guard("v outer0 cross",peak,limit); value-=other
    elif outer==1:
        value=2*v[8][0]*v[8][1]; guard("v outer1 first",peak,limit); other=v[7][0]*v[9][1]; guard("v outer1 second",peak,limit); value-=other; del other; gc.collect(); other=v[7][1]*v[9][0]; guard("v outer1 third",peak,limit); value-=other
    else:
        assert outer==2; value=v[8][1]*v[8][1]; guard("v outer2 square",peak,limit); other=v[7][1]*v[9][1]; guard("v outer2 cross",peak,limit); value-=other
    del other; gc.collect(); guard(f"complete V curvature outer{outer}",peak,limit); return value

def stream(poly,outer,completes,peak,limit):
    digests={1:hashlib.sha256(),4:hashlib.sha256()}; terms=negative=0; minimum=first=None; previous=None
    for index in range(len(poly)):
        reduced=tuple(map(int,poly.monomial(index))); key=(-sum(reduced),tuple(reversed(reduced)))
        if previous is not None: assert previous<=key
        previous=key; assert sum(reduced)+outer==DEGREE
        if not any(reduced[i] for i in GA): continue
        if outer==0 and not any(reduced[i] for i in GB): continue
        coefficient=int(poly.coefficient(index)); assert coefficient; full=(0,0,0,0,0)+reduced+(outer,); prefix=",".join(map(str,full))+":"
        for scale in (1,4):
            encoded=(prefix+str(scale*coefficient)+"\n").encode(); digests[scale].update(encoded); completes[scale].update(encoded)
        terms+=1; minimum=coefficient if minimum is None else min(minimum,coefficient)
        if coefficient<0:
            negative+=1
            if first is None: first={"monomial":list(full),"coefficient":coefficient}
        if terms%100000==0: print("TAIL V OUTER",outer,"MIXED",terms,"PRIVATE",private_bytes(),flush=True); guard(f"tail V outer{outer} term{terms}",peak,limit)
    return {"outer_exponent":outer,"unfiltered_terms":len(poly),"mixed_support_terms":terms,"negative_terms":negative,"minimum_far":minimum,"first_negative_far":first,"ordered_far_coefficient_sha256":digests[1].hexdigest().upper(),"ordered_middle_coefficient_sha256":digests[4].hexdigest().upper()}
def scaled(item,scale):
    first=item["first_negative_far"]
    return {"outer_exponent":item["outer_exponent"],"unfiltered_terms":item["unfiltered_terms"],"mixed_support_terms":item["mixed_support_terms"],"negative_terms":item["negative_terms"],"minimum":None if item["minimum_far"] is None else scale*item["minimum_far"],"first_negative":None if first is None else {"monomial":first["monomial"],"coefficient":scale*first["coefficient"]},"ordered_coefficient_sha256":item["ordered_far_coefficient_sha256" if scale==1 else "ordered_middle_coefficient_sha256"]}

def write_artifacts(output,stats,complete,source,peak,limit):
    cells=[]
    for token,face in FACES:
        for label,scale in LABELS:
            prefix=output/f"rank8_low_low_a23_mixed_cross_face_{token}_{label}_grade_16_outer_stream_agent_20260823"; chunks=[]
            for item in stats:
                chunk=scaled(item,scale); payload={"schema":"rank8-low-low-a23-mixed-cross-grade16-tail-v-top-shared-chunk-agent-v1","status":"PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE" if chunk["negative_terms"]==0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT","face":list(face),"bridge_corner":[2*face[0],2*face[1]],"family":"curvature","auxiliary":label,"total_ordinary_slack_degree":DEGREE,"outer_variable":"b0","outer_exponent":chunk["outer_exponent"],"outer_support_bound":[0,2],"variables":list(FULL),"row_scale_from_shared_far_polynomial":scale,"canonical_convolution":"V=([0,0,0]+left[3:])*right","chunk":chunk,"source_sha256":source,"canonical_source":{"path":CANONICAL[0],"sha256":CANONICAL[1]}}
                path=Path(str(prefix)+f"_b0_exp_{chunk['outer_exponent']}.json"); digest=atomic_json(path,payload); chunks.append({"outer_exponent":chunk["outer_exponent"],"path":str(path.resolve()),"sha256":digest,"mixed_support_terms":chunk["mixed_support_terms"],"negative_terms":chunk["negative_terms"],"minimum":chunk["minimum"],"ordered_coefficient_sha256":chunk["ordered_coefficient_sha256"]})
            total=sum(x["mixed_support_terms"] for x in chunks); negatives=sum(x["negative_terms"] for x in chunks)
            manifest={"schema":"rank8-low-low-a23-mixed-cross-grade16-tail-v-top-shared-manifest-agent-v1","status":"PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE" if negatives==0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT","face":list(face),"bridge_corner":[2*face[0],2*face[1]],"family":"curvature","auxiliary":label,"total_ordinary_slack_degree":DEGREE,"outer_variable":"b0","outer_exponent_range":[0,2],"global_row_assembly":False,"construction_identity":"[b0^e](V8^2-V7*V9), V=([0,0,0]+left[3:])*right","literal_identities":{"canonical_oriented_left_tail_used":True,"full_convolution_C_excluded":True,"face_01_equals_face_10":True,"middle_equals_4_times_far":True},"hard_private_memory_limit_bytes":limit,"observed_peak_private_bytes_at_checkpoints":peak[0],"result":{"chunks":chunks,"mixed_support_terms":total,"negative_terms":negatives,"ordered_coefficient_sha256":complete[scale],"piece_names":["grade16_base_tail_curvature_top"],"piece_scales":[scale]},"source_sha256":source,"canonical_source":{"path":CANONICAL[0],"sha256":CANONICAL[1]},"theoretical_note":{"path":NOTE[0],"sha256":NOTE[1]}}
            path=Path(str(prefix)+"_manifest.json"); digest=atomic_json(path,manifest); cells.append({"face_token":token,"face":list(face),"auxiliary":label,"scale":scale,"manifest":str(path.resolve()),"manifest_sha256":digest,"mixed_support_terms":total,"negative_terms":negatives,"ordered_coefficient_sha256":complete[scale]})
    return cells

def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--output-directory",default="."); parser.add_argument("--private-limit",type=int,default=DEFAULT_LIMIT); args=parser.parse_args(); output=Path(args.output_directory).resolve(); output.mkdir(parents=True,exist_ok=True)
    assert sha256(HERE/NOTE[0])==NOTE[1] and sha256(HERE/CANONICAL[0])==CANONICAL[1]
    source=sha256(Path(__file__)); peak=[0]; guard("start",peak,args.private_limit); context=fmpz_mpoly_ctx.get(REDUCED,"degrevlex"); v=build_tail_convolutions(context,peak,args.private_limit)
    completes={1:hashlib.sha256(),4:hashlib.sha256()}; stats=[]
    for outer in (0,1,2):
        FAILURE_CONTEXT["outer_exponent"]=outer; poly=slice_polynomial(v,outer,peak,args.private_limit); item=stream(poly,outer,completes,peak,args.private_limit); stats.append(item); print("TAIL V SLICE",outer,"UNFILTERED",item["unfiltered_terms"],"MIXED",item["mixed_support_terms"],"NEGATIVE",item["negative_terms"],"MIN",item["minimum_far"],flush=True); del poly; gc.collect(); guard(f"released outer{outer}",peak,args.private_limit)
    complete={scale:d.hexdigest().upper() for scale,d in completes.items()}; cells=write_artifacts(output,stats,complete,source,peak,args.private_limit); passed=len(cells)==4 and all(x["negative_terms"]==0 for x in cells)
    assert cells[0]["ordered_coefficient_sha256"]==cells[2]["ordered_coefficient_sha256"] and cells[1]["ordered_coefficient_sha256"]==cells[3]["ordered_coefficient_sha256"]
    job={"schema":"rank8-low-low-a23-mixed-cross-grade16-tail-v-top-shared-job-agent-v1","status":"PASS_EXACT_CANONICAL_TAIL_V_SHARED_GRADE16_FOUR_CURVATURE_CELLS_NONNEGATIVE" if passed else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT","total_ordinary_slack_degree":DEGREE,"completed_cells":cells,"outer_slices":stats,"formula_scope":{"canonical_curvature_uses_tail_v":True,"tail_definition":"[0,0,0]+left[3:]","full_convolution_c_excluded":True,"far_formula":"V8^2-V7*V9","face_01_equals_face_10":True,"middle_equals_4_times_far":True},"hard_private_memory_limit_bytes":args.private_limit,"observed_peak_private_bytes_at_checkpoints":peak[0],"source_sha256":source,"canonical_source":{"path":CANONICAL[0],"sha256":CANONICAL[1]},"theoretical_note":{"path":NOTE[0],"sha256":NOTE[1]}}
    path=output/"rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_top_shared_job_agent_20260823.json"; digest=atomic_json(path,job); print("JOB",path,digest,job["status"],flush=True)
    if not passed: raise SystemExit(2)
if __name__=="__main__":
    try: main()
    except BaseException as exc:
        atomic_json(HERE/"rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_top_shared_failure_agent_20260823.json",{"schema":"rank8-low-low-a23-mixed-cross-grade16-tail-v-failure-agent-v1","status":"FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP","exception_type":type(exc).__name__,"exception":str(exc),"context":FAILURE_CONTEXT,"source_sha256":sha256(Path(__file__))}); raise
