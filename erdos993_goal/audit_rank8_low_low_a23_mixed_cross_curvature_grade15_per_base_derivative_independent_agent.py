#!/usr/bin/env python3
"""Independent per-base derivative replay for distinct curvature grade15 faces.

Unlike the producer's single 14-variable first-order algebra, this audit works
in nine slack variables and differentiates once with respect to each of the
five base variables separately.  Ten piece streams are then merged in the
canonical 15-variable monomial order.  No producer code is imported.
"""
from __future__ import annotations
import argparse,ctypes,gc,hashlib,heapq,json,math,os
from ctypes import wintypes
from pathlib import Path
from flint import fmpz_mpoly_ctx
HERE=Path(__file__).resolve().parent
JOB="rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_job_agent_20260823.json"; JOB_SHA256="3CB2464AC31B924B01284B487BC8DF83F9CB44A17E4E72513AFF4AD281771839"; PRODUCER_SOURCE="D408E1A73F202934652BDC19C830AD3C6BC3D826E79080F4B5798DDF448261E4"
SCOPE=("rank8_low_low_a23_mixed_cross_curvature_grade15_formula_scope_audit_agent_20260823.json","2A77D56302225E2B399D9D8425F78036346AA986DFCFA2EC672E84A822E75BF2")
BASE=("h","ta","tb","P","Q"); SLACK=("a0","b4","b5","b6","b7","a4","a5","a6","a7"); FACES=(("01",(0,1)),("10",(1,0))); LABELS=(("curvature_middle_times_4",4,2),("curvature_far",1,1)); DEGREE=15; LIMIT=475_000_000; FAILURE_CONTEXT={}
class PMC(ctypes.Structure):
    _fields_=[("cb",wintypes.DWORD),("PageFaultCount",wintypes.DWORD),("PeakWorkingSetSize",ctypes.c_size_t),("WorkingSetSize",ctypes.c_size_t),("QuotaPeakPagedPoolUsage",ctypes.c_size_t),("QuotaPagedPoolUsage",ctypes.c_size_t),("QuotaPeakNonPagedPoolUsage",ctypes.c_size_t),("QuotaNonPagedPoolUsage",ctypes.c_size_t),("PagefileUsage",ctypes.c_size_t),("PeakPagefileUsage",ctypes.c_size_t),("PrivateUsage",ctypes.c_size_t)]
def private_bytes():
    c=PMC(); c.cb=ctypes.sizeof(c); cur=ctypes.windll.kernel32.GetCurrentProcess; cur.restype=wintypes.HANDLE; q=ctypes.windll.psapi.GetProcessMemoryInfo; q.argtypes=(wintypes.HANDLE,ctypes.POINTER(PMC),wintypes.DWORD); q.restype=wintypes.BOOL
    if not q(cur(),ctypes.byref(c),c.cb): raise OSError("GetProcessMemoryInfo failed")
    return int(c.PrivateUsage)
def guard(stage,peak,limit):
    current=private_bytes(); peak[0]=max(peak[0],current); FAILURE_CONTEXT.update(stage=stage,private_bytes=current,peak_private_bytes=peak[0])
    if current>=limit: raise MemoryError(f"private-memory guard {stage}: {current} >= {limit}")
def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()
def atomic_json(path,payload):
    path=Path(path); temp=path.with_suffix(path.suffix+".tmp"); temp.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8"); os.replace(temp,path); return sha256(path)
def pinned(path,expected):
    assert sha256(path)==expected,(Path(path).name,sha256(path),expected); return json.loads(Path(path).read_text(encoding="utf-8"))
class J:
    __slots__=("v","d")
    def __init__(self,v,d): self.v=v; self.d=d
    def __add__(self,other):
        if not isinstance(other,J): other=J(other,self.v.context().constant(0))
        return J(self.v+other.v,self.d+other.d)
    __radd__=__add__
    def __neg__(self): return J(-self.v,-self.d)
    def __sub__(self,other): return self+(-other)
    def __mul__(self,other):
        if not isinstance(other,J): return J(self.v*other,self.d*other)
        return J(self.v*other.v,self.v*other.d+self.d*other.v)
    __rmul__=__mul__
def pair_add(x,y): return (x[0]+y[0],x[1]+y[1])
def pair_mul(x,y):
    assert (not x[1].v and not x[1].d) or (not y[1].v and not y[1].d)
    return (x[0]*y[0],x[0]*y[1]+x[1]*y[0])
def zpair(z): return (J(z,z),J(z,z))
def build(face,base_name,context,peak,limit):
    raw=dict(zip(SLACK,context.gens())); zero=context.constant(0); one=context.constant(1); b={name:J(zero,one if name==base_name else zero) for name in BASE}; s={name:J(raw[name],zero) for name in SLACK}; h,ta,tb,P,Q=(b[name] for name in BASE); z,w=face; a2=(1-z)*P; a3=z*P; b2=(1-w)*Q; b3=w*Q
    gaps=[2*h+s["a0"],h,h+a2,h+a3,h+s["a4"],h+s["a5"],h+s["a6"],h+s["a7"]]; ratios=[None]*9; ratios[8]=ta
    for i in range(7,-1,-1): ratios[i]=ratios[i+1]+gaps[i]
    left=[J(one,zero)]
    for ratio in ratios: left.append(left[-1]*ratio)
    tail=[J(zero,zero),J(zero,zero),J(zero,zero)]+left[3:]
    rg=[2*h,h,h+b2,h+b3,h+s["b4"],h+s["b5"],h+s["b6"],h+s["b7"]]; rr=[None]*9; rr[8]=(tb,J(zero,zero))
    for i in range(7,-1,-1): rr[i]=pair_add(rr[i+1],(rg[i],J(one,zero) if i==0 else J(zero,zero)))
    right=[(J(one,zero),J(zero,zero))]
    for ratio in rr: right.append(pair_mul(right[-1],ratio))
    direction=[zpair(zero) for _ in range(10)]; direction[3]=(right[2][0]*h,right[2][1]*h)
    for rank in range(4,10): direction[rank]=pair_mul(direction[rank-1],rr[rank-1])
    v={}; dv={}
    for rank in (7,8,9):
        vp=zpair(zero); dp=zpair(zero)
        for i in range(rank+1):
            weight=math.comb(rank,i); vp=pair_add(vp,(weight*tail[i]*right[rank-i][0],weight*tail[i]*right[rank-i][1])); dp=pair_add(dp,(weight*tail[i]*direction[rank-i][0],weight*tail[i]*direction[rank-i][1]))
        v[rank]=vp; dv[rank]=dp
    guard(f"independent {face} derivative {base_name}",peak,limit); return h,v,dv
def pair_product(x,y,e,zero):
    result=J(zero,zero)
    for i in range(2):
        j=e-i
        if 0<=j<2: result+=x[i]*y[j]
    return result
def pieces(h,v,dv,e,zero,peak,limit):
    base=pair_product(v[8],v[8],e,zero); other=pair_product(v[7],v[9],e,zero); base-=other; del other; gc.collect(); other=h*pair_product(v[7],v[8],e,zero); base-=other; del other; gc.collect()
    linear=2*pair_product(v[8],dv[8],e,zero); other=pair_product(v[7],dv[9],e,zero); linear-=other; del other; gc.collect(); other=pair_product(dv[7],v[9],e,zero); linear-=other; del other; gc.collect(); other=h*(pair_product(v[7],dv[8],e,zero)+pair_product(dv[7],v[8],e,zero)); linear-=other; del other; gc.collect(); guard(f"independent pieces e{e}",peak,limit); return base.d,linear.d
class Cursor:
    def __init__(self,poly,base_index,piece_index,outer): self.poly=poly; self.base_index=base_index; self.piece_index=piece_index; self.outer=outer; self.index=0
    def advance(self):
        if self.index>=len(self.poly): return None
        reduced=tuple(map(int,self.poly.monomial(self.index))); coefficient=int(self.poly.coefficient(self.index)); self.index+=1; base=tuple(1 if i==self.base_index else 0 for i in range(5)); full=base+reduced+(self.outer,); return (-sum(full),tuple(reversed(full))),full,coefficient
def merge(records,outer,complete,peak,limit):
    cursors=[]
    for base_index,(base_poly,linear_poly) in enumerate(records):
        for piece_index,poly in enumerate((base_poly,linear_poly)):
            if len(poly): cursors.append(Cursor(poly,base_index,piece_index,outer))
    heap=[]
    for i,cursor in enumerate(cursors):
        item=cursor.advance()
        if item is not None: heapq.heappush(heap,(item[0],i,item[1],item[2]))
    stats={label:{"outer_exponent":outer,"mixed_support_terms":0,"negative_terms":0,"minimum":None,"first_negative":None,"ordered_coefficient_sha256":None} for label,_,_ in LABELS}; digests={label:hashlib.sha256() for label,_,_ in LABELS}; raw=0; previous=None
    while heap:
        k,i,full,coef=heapq.heappop(heap); coefficients=[0,0]; coefficients[cursors[i].piece_index]+=coef; consumed=[i]
        while heap and heap[0][0]==k:
            _,j,other_full,other_coef=heapq.heappop(heap); assert other_full==full; coefficients[cursors[j].piece_index]+=other_coef; consumed.append(j)
        for j in consumed:
            item=cursors[j].advance()
            if item is not None: heapq.heappush(heap,(item[0],j,item[1],item[2]))
        if previous is not None: assert previous<=k
        previous=k; raw+=1; reduced=full[5:-1]; assert sum(full[:5])==1 and sum(reduced)+outer==DEGREE
        if not any(reduced[i] for i in range(5)): continue
        if outer==0 and not any(reduced[i] for i in range(5,9)): continue
        prefix=",".join(map(str,full))+":"
        for label,bs,ls in LABELS:
            coefficient=bs*coefficients[0]+ls*coefficients[1]
            if not coefficient: continue
            encoded=(prefix+str(coefficient)+"\n").encode(); digests[label].update(encoded); complete[label].update(encoded); stat=stats[label]; stat["mixed_support_terms"]+=1; stat["minimum"]=coefficient if stat["minimum"] is None else min(stat["minimum"],coefficient)
            if coefficient<0:
                stat["negative_terms"]+=1
                if stat["first_negative"] is None: stat["first_negative"]={"monomial":list(full),"coefficient":coefficient}
        if raw%100000==0: print("INDEPENDENT MERGE OUTER",outer,"RAW",raw,"PRIVATE",private_bytes(),flush=True); guard(f"independent merge e{outer} raw{raw}",peak,limit)
    for label in stats: stats[label]["ordered_coefficient_sha256"]=digests[label].hexdigest().upper(); stats[label]["unfiltered_union_terms"]=raw
    return stats
def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--private-limit",type=int,default=LIMIT); args=parser.parse_args(); assert JOB_SHA256!="__PIN_AFTER_PRODUCER__"; scope=pinned(HERE/SCOPE[0],SCOPE[1]); assert scope["status"]=="PASS_CANONICAL_GRADE15_CURVATURE_SCOPE_TAIL_V_BASE_LINEAR_DISTINCT_FACES"; job=pinned(HERE/JOB,JOB_SHA256); assert job["source_sha256"]==PRODUCER_SOURCE
    peak=[0]; all_replays={}; completed={}
    for token,face in FACES:
        context=fmpz_mpoly_ctx.get(SLACK,"degrevlex"); zero=context.constant(0); complete={label:hashlib.sha256() for label,_,_ in LABELS}; replays={label:[] for label,_,_ in LABELS}
        for outer in (0,1,2):
            records=[]
            for base_name in BASE:
                FAILURE_CONTEXT.update(face_token=token,outer_exponent=outer,base_variable=base_name); h,v,dv=build(face,base_name,context,peak,args.private_limit); records.append(pieces(h,v,dv,outer,zero,peak,args.private_limit)); del h,v,dv; gc.collect()
            stats=merge(records,outer,complete,peak,args.private_limit)
            for label,_,_ in LABELS: replays[label].append(stats[label]); print("AUDIT FACE",token,"ROW",label,"OUTER",outer,"TERMS",stats[label]["mixed_support_terms"],"NEG",stats[label]["negative_terms"],"MIN",stats[label]["minimum"],flush=True)
            del records; gc.collect(); guard(f"audit released face{token} outer{outer}",peak,args.private_limit)
        all_replays[token]=replays; completed[token]={label:complete[label].hexdigest().upper() for label,_,_ in LABELS}; del context; gc.collect()
    produced={(x["face_token"],x["auxiliary"]):x for x in job["completed_cells"]}; cells=[]
    for token,face in FACES:
        for label,_,_ in LABELS:
            item=produced[(token,label)]; path=Path(item["manifest"]); assert sha256(path)==item["manifest_sha256"]; manifest=json.loads(path.read_text(encoding="utf-8")); assert manifest["canonical_scope"]["oriented_left_tail_V"] is True and manifest["canonical_scope"]["full_convolution_C_excluded"] is True and manifest["canonical_scope"]["faces_computed_separately"] is True; assert manifest["result"]["ordered_coefficient_sha256"]==completed[token][label]
            for replay,record in zip(all_replays[token][label],manifest["result"]["chunks"]):
                chunk=pinned(Path(record["path"]),record["sha256"]); assert chunk["chunk"]==replay and record["ordered_coefficient_sha256"]==replay["ordered_coefficient_sha256"] and replay["negative_terms"]==0
            cells.append({"face_token":token,"face":list(face),"auxiliary":label,"producer_manifest":path.name,"producer_manifest_sha256":item["manifest_sha256"],"replayed_negative_terms":0,"replayed_ordered_coefficient_sha256":completed[token][label],"row_replays":all_replays[token][label]})
    report={"schema":"rank8-low-low-a23-mixed-cross-curvature-grade15-per-base-derivative-independent-audit-agent-v1","status":"PASS_INDEPENDENT_PER_BASE_DERIVATIVE_RECONSTRUCTION_BOTH_DISTINCT_FACES_GRADE15_CURVATURE_ROWS","imports_producer":False,"producer_job":JOB,"producer_job_sha256":JOB_SHA256,"producer_source_sha256":PRODUCER_SOURCE,"scope_audit":{"path":SCOPE[0],"sha256":SCOPE[1]},"total_ordinary_slack_degree":DEGREE,"cells":cells,"row_replays":all_replays,"checks":{"canonical_oriented_tail_V":True,"full_convolution_C_excluded":True,"base_and_linear_only":True,"direction_excluded":True,"five_base_derivatives_separately_reconstructed":True,"faces_separately_reconstructed":True,"face_hash_reuse":False},"hard_private_memory_limit_bytes":args.private_limit,"observed_peak_private_bytes_at_checkpoints":peak[0],"source_sha256":sha256(Path(__file__))}
    output=HERE/"rank8_low_low_a23_mixed_cross_curvature_grade15_per_base_derivative_independent_audit_agent_20260823.json"; print("AUDIT REPORT",output,atomic_json(output,report),report["status"],flush=True)
if __name__=="__main__":
    try: main()
    except BaseException as exc:
        atomic_json(HERE/"rank8_low_low_a23_mixed_cross_curvature_grade15_per_base_derivative_independent_audit_failure_agent_20260823.json",{"schema":"rank8-low-low-a23-mixed-cross-curvature-grade15-independent-audit-failure-agent-v1","status":"FAIL_CLOSED_INDEPENDENT_AUDIT_EXCEPTION_OR_MEMORY_STOP","exception_type":type(exc).__name__,"exception":str(exc),"context":FAILURE_CONTEXT,"source_sha256":sha256(Path(__file__))}); raise
