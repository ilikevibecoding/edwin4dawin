#!/usr/bin/env python3
"""Independent coefficient replay of corrected grade-16 tail curvature."""
from __future__ import annotations
import argparse, ctypes, gc, hashlib, json, math, os
from ctypes import wintypes
from pathlib import Path
from flint import fmpz_mpoly_ctx

HERE=Path(__file__).resolve().parent
JOB="rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_top_shared_job_agent_20260823.json"; JOB_SHA256="6C8A81906AACA6224B888B16F64A08FFBD952BB5A8CCAA94B18C9A78F7764122"
PRODUCER_SOURCE="F8A4C160C3E4F605E8B6FEFB805691452BD4F8EA795CD269500801A1E30FB8A8"
SCOPE=("rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_formula_scope_audit_agent_20260823.json","1A550E118C118EB55681099B9EEE320E0651A1A3A260792FC9146E2754E6C188")
REDUCED=("a0","b4","b5","b6","b7","a4","a5","a6","a7"); GA=(0,1,2,3,4); GB=(5,6,7,8)
FACES=(("01",(0,1)),("10",(1,0))); LABELS=(("curvature_middle_times_4",4),("curvature_far",1)); DEGREE=16; LIMIT=475_000_000; FAILURE_CONTEXT={}
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
def pinned(path,expected):
    assert sha256(path)==expected,(Path(path).name,sha256(path),expected); return json.loads(Path(path).read_text(encoding="utf-8"))

def explicit_tail_v(context,peak,limit):
    x=dict(zip(REDUCED,context.gens())); zero=context.constant(0); one=context.constant(1)
    A=x["a4"]+x["a5"]+x["a6"]+x["a7"]; A5=x["a5"]+x["a6"]+x["a7"]; A6=x["a6"]+x["a7"]; X=x["a0"]+A
    B=x["b4"]+x["b5"]+x["b6"]+x["b7"]; B5=x["b5"]+x["b6"]+x["b7"]; B6=x["b6"]+x["b7"]
    left=[one,X,X*A,X*A**2,X*A**3,X*A**4,X*A**4*A5,X*A**4*A5*A6,X*A**4*A5*A6*x["a7"],zero]
    # Independent closed-product transcription of canonical [0,0,0]+left[3:].
    tail=[zero,zero,zero,left[3],left[4],left[5],left[6],left[7],left[8],zero]
    right0=[one,B,B**2,B**3,B**4,B**5,B**5*B5,B**5*B5*B6,B**5*B5*B6*x["b7"],zero]
    right1=[zero,one,B,B**2,B**3,B**4,B**4*B5,B**4*B5*B6,B**4*B5*B6*x["b7"],zero]
    for rank in range(1,9): assert right0[rank]==B*right1[rank]
    guard("independent explicit tail rows",peak,limit); v={}
    for rank in (7,8,9):
        v0=zero; v1=zero
        for i in range(rank+1):
            v0+=math.comb(rank,i)*tail[i]*right0[rank-i]; v1+=math.comb(rank,i)*tail[i]*right1[rank-i]
        v[rank]=(v0,v1); guard(f"independent V{rank}",peak,limit)
    return v
def slice_polynomial(v,outer,peak,limit):
    if outer==0:
        value=v[8][0]*v[8][0]; guard("audit V outer0 square",peak,limit); other=v[7][0]*v[9][0]; guard("audit V outer0 cross",peak,limit); value-=other
    elif outer==1:
        value=2*v[8][0]*v[8][1]; guard("audit V outer1 first",peak,limit); other=v[7][0]*v[9][1]; guard("audit V outer1 second",peak,limit); value-=other; del other; gc.collect(); other=v[7][1]*v[9][0]; guard("audit V outer1 third",peak,limit); value-=other
    else:
        assert outer==2; value=v[8][1]*v[8][1]; guard("audit V outer2 square",peak,limit); other=v[7][1]*v[9][1]; guard("audit V outer2 cross",peak,limit); value-=other
    del other; gc.collect(); guard(f"audit V outer{outer} complete",peak,limit); return value
def replay(poly,outer,completes,peak,limit):
    digests={1:hashlib.sha256(),4:hashlib.sha256()}; terms=negative=0; minimum=first=None; previous=None
    for index in range(len(poly)):
        reduced=tuple(map(int,poly.monomial(index))); key=(-sum(reduced),tuple(reversed(reduced)))
        if previous is not None: assert previous<=key
        previous=key; assert sum(reduced)+outer==DEGREE
        if not any(reduced[i] for i in GA): continue
        if outer==0 and not any(reduced[i] for i in GB): continue
        coefficient=int(poly.coefficient(index)); full=(0,0,0,0,0)+reduced+(outer,); prefix=",".join(map(str,full))+":"
        for scale in (1,4):
            encoded=(prefix+str(scale*coefficient)+"\n").encode(); digests[scale].update(encoded); completes[scale].update(encoded)
        terms+=1; minimum=coefficient if minimum is None else min(minimum,coefficient)
        if coefficient<0:
            negative+=1
            if first is None: first={"monomial":list(full),"coefficient":coefficient}
        if terms%100000==0: print("AUDIT TAIL V OUTER",outer,"MIXED",terms,"PRIVATE",private_bytes(),flush=True); guard(f"audit outer{outer} term{terms}",peak,limit)
    return {"outer_exponent":outer,"unfiltered_terms":len(poly),"mixed_support_terms":terms,"negative_terms":negative,"minimum_far":minimum,"first_negative_far":first,"ordered_far_coefficient_sha256":digests[1].hexdigest().upper(),"ordered_middle_coefficient_sha256":digests[4].hexdigest().upper()}
def scaled(item,scale):
    first=item["first_negative_far"]; return {"outer_exponent":item["outer_exponent"],"unfiltered_terms":item["unfiltered_terms"],"mixed_support_terms":item["mixed_support_terms"],"negative_terms":item["negative_terms"],"minimum":None if item["minimum_far"] is None else scale*item["minimum_far"],"first_negative":None if first is None else {"monomial":first["monomial"],"coefficient":scale*first["coefficient"]},"ordered_coefficient_sha256":item["ordered_far_coefficient_sha256" if scale==1 else "ordered_middle_coefficient_sha256"]}
def validate(job,replays,complete):
    assert job["status"]=="PASS_EXACT_CANONICAL_TAIL_V_SHARED_GRADE16_FOUR_CURVATURE_CELLS_NONNEGATIVE" and job["source_sha256"]==PRODUCER_SOURCE and job["outer_slices"]==replays
    assert job["formula_scope"]["canonical_curvature_uses_tail_v"] is True and job["formula_scope"]["full_convolution_c_excluded"] is True
    produced={(x["face_token"],x["auxiliary"]):x for x in job["completed_cells"]}; cells=[]
    for token,face in FACES:
        for label,scale in LABELS:
            item=produced[(token,label)]; path=Path(item["manifest"]); assert sha256(path)==item["manifest_sha256"]; manifest=json.loads(path.read_text(encoding="utf-8"))
            assert manifest["source_sha256"]==PRODUCER_SOURCE and manifest["face"]==list(face) and manifest["auxiliary"]==label and manifest["literal_identities"]["canonical_oriented_left_tail_used"] is True and manifest["literal_identities"]["full_convolution_C_excluded"] is True
            assert manifest["result"]["negative_terms"]==0 and manifest["result"]["ordered_coefficient_sha256"]==complete[scale]
            for source,record in zip(replays,manifest["result"]["chunks"]):
                chunk_path=Path(record["path"]); assert sha256(chunk_path)==record["sha256"]; chunk=json.loads(chunk_path.read_text(encoding="utf-8")); expected=scaled(source,scale); assert chunk["chunk"]==expected and chunk["canonical_convolution"]=="V=([0,0,0]+left[3:])*right" and record["ordered_coefficient_sha256"]==expected["ordered_coefficient_sha256"] and record["negative_terms"]==0
            cells.append({"face_token":token,"face":list(face),"auxiliary":label,"scale_from_far":scale,"producer_manifest":path.name,"producer_manifest_sha256":item["manifest_sha256"],"mixed_support_terms":item["mixed_support_terms"],"replayed_negative_terms":0,"replayed_ordered_coefficient_sha256":complete[scale]})
    assert cells[0]["replayed_ordered_coefficient_sha256"]==cells[2]["replayed_ordered_coefficient_sha256"] and cells[1]["replayed_ordered_coefficient_sha256"]==cells[3]["replayed_ordered_coefficient_sha256"]
    return cells
def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--private-limit",type=int,default=LIMIT); args=parser.parse_args(); assert JOB_SHA256!="__PIN_AFTER_PRODUCER__"
    scope=pinned(HERE/SCOPE[0],SCOPE[1]); assert scope["status"]=="PASS_THIRD_CANONICAL_FORMULA_SCOPE_AUDIT_TAIL_V_NOT_FULL_C"; job=pinned(HERE/JOB,JOB_SHA256); peak=[0]; guard("audit start",peak,args.private_limit); context=fmpz_mpoly_ctx.get(REDUCED,"degrevlex"); v=explicit_tail_v(context,peak,args.private_limit)
    completes={1:hashlib.sha256(),4:hashlib.sha256()}; replays=[]
    for outer in (0,1,2):
        FAILURE_CONTEXT["outer_exponent"]=outer; poly=slice_polynomial(v,outer,peak,args.private_limit); item=replay(poly,outer,completes,peak,args.private_limit); replays.append(item); print("AUDIT TAIL V SLICE",outer,"UNFILTERED",item["unfiltered_terms"],"MIXED",item["mixed_support_terms"],"NEGATIVE",item["negative_terms"],"MIN",item["minimum_far"],flush=True); del poly; gc.collect(); guard(f"audit released outer{outer}",peak,args.private_limit)
    complete={scale:d.hexdigest().upper() for scale,d in completes.items()}; cells=validate(job,replays,complete)
    report={"schema":"rank8-low-low-a23-mixed-cross-grade16-tail-v-independent-audit-agent-v1","status":"PASS_INDEPENDENT_CLOSED_FORM_TAIL_V_RECONSTRUCTION_ALL_FOUR_GRADE16_CURVATURE_CELLS","imports_producer":False,"producer_job":JOB,"producer_job_sha256":JOB_SHA256,"producer_source_sha256":PRODUCER_SOURCE,"formula_scope_audit":{"path":SCOPE[0],"sha256":SCOPE[1]},"total_ordinary_slack_degree":DEGREE,"replayed_outer_slices":replays,"cells":cells,"literal_identity_checks":{"canonical_oriented_left_tail_used":True,"full_convolution_C_excluded":True,"face_01_equals_face_10_coefficientwise":True,"middle_equals_4_times_far_coefficientwise":True,"all_four_rows_have_zero_negative_coefficients":True},"hard_private_memory_limit_bytes":args.private_limit,"observed_peak_private_bytes_at_checkpoints":peak[0],"source_sha256":sha256(Path(__file__))}
    output=HERE/"rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_top_shared_independent_audit_agent_20260823.json"; print("AUDIT REPORT",output,atomic_json(output,report),report["status"],flush=True)
if __name__=="__main__":
    try: main()
    except BaseException as exc:
        atomic_json(HERE/"rank8_low_low_a23_mixed_cross_curvature_grade16_tail_v_top_shared_independent_audit_failure_agent_20260823.json",{"schema":"rank8-low-low-a23-mixed-cross-grade16-tail-v-independent-audit-failure-agent-v1","status":"FAIL_CLOSED_INDEPENDENT_AUDIT_EXCEPTION_OR_MEMORY_STOP","exception_type":type(exc).__name__,"exception":str(exc),"context":FAILURE_CONTEXT,"source_sha256":sha256(Path(__file__))}); raise
