#!/usr/bin/env python3
"""Exact finite N=14..18 census for the adjacent parent0 safe-cap lower."""

from __future__ import annotations
import hashlib,json,math
from pathlib import Path
import numpy as np
from census_iso_n6_bundle_g2_adjacent_forest_jets_n14_18_root import enumerate_forest_polynomials,row_corner,truncate
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS,K2_TERMS,L2_TERMS

HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_n14_18_exact_rank7_g5_finish_20260831.json"
MARKER="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_SAFE_CAP_N14_18_RANK7_G5_FINISH"
REDUCTION=HERE/"iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_lower_exact_rank7_g5_finish_20260831.json"
REDUCTION_SHA256="D269AE7EF028A81175C8FC0D17F9562A6B2ECE000D957F247ED845D8E12414A0"
CORNER=HERE/"iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json"
CORNER_SHA256="E52910E26F129A208CB7BB5F1BFCC625C6919F92BC6C5C9563543E325BD14001"

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def bilinear(x,y,t):return sum(q*int(x[i])*int(y[j]) for q,i,j in t)
def audit_signs(n):
    c=math.comb;path=lambda o,r:c(o-r+1,r) if o-r+1>=r else 0
    values={
        "PA3_PB3_derivative_floor":-2*c(n,2)+path(n,3)+7*path(n,4)-2*n,
        "PW2_derivative_floor":-2*c(n,3)+2*path(n,4)+7*path(n,5)-4*c(n,2),
        "minus_PA5_PB5_derivative_floor":-(8*n-5*path(n,2)),
        "minus_PW4_derivative_floor":2*path(n,2)+10*path(n,3),
        "B3_C3_derivative_floor":4*n+9*path(n,2)-5*c(n-1,2),
    }
    assert all(v>0 for v in values.values()),(n,values);return values

def audit_order(n,polynomials):
    jets=sorted({truncate(poly,8) for poly in polynomials});keys=[(o,m) for o in range(n+1) for m in (0,1)];rows=np.asarray([row_corner(o,bool(m)) for o,m in keys],dtype=np.int64);index={q:i for i,q in enumerate(keys)}
    cfg=[(mb,mc,bm,cm) for mb in range(n+1) for mc in range(n+1) if mb+mc>=n for bm in (0,1) for cm in (0,1)]
    mb=np.asarray([q[0] for q in cfg],dtype=np.int64);mc=np.asarray([q[1] for q in cfg],dtype=np.int64);bi=np.asarray([index[(q[0],q[2])] for q in cfg]);ci=np.asarray([index[(q[1],q[3])] for q in cfg]);b=rows[bi];c=rows[ci]
    kv=np.zeros(len(cfg),dtype=np.int64)
    for q,i,j in K2_TERMS:kv+=q*b[:,i]*c[:,j]
    h=n-1;h2=math.comb(h,2);h3=math.comb(h,3);checks=negative=0;minimum=None;witness=None;stream=hashlib.sha256()
    for a in jets:
        lv=np.zeros(len(rows),dtype=np.int64)
        for q,i,j in L2_TERMS:lv+=q*a[i]*rows[:,j]
        base=bilinear(a,a,A2_TERMS)+lv[bi]+lv[ci]+kv
        kpa4=-2*n-2*a[2]-5*a[3]-12*c[:,2];kpa5=n-5*a[2]+7*mc
        kpb4=-2*n-2*a[2]-5*a[3]-12*b[:,2];kpb5=n-5*a[2]+7*mb
        negpw3=4*a[2]+2*a[3]+2*mb+2*b[:,2]+5*b[:,3]+2*mc+2*c[:,2]+5*c[:,3]
        kpw4=-2*n-2*a[2]-10*a[3]+mb-5*b[:,2]+mc-5*c[:,2]
        values=base+(kpa4+kpb4)*h2+(kpa5+kpb5)*h3-negpw3*h2+kpw4*h3
        checks+=int(values.size);negative+=int(np.count_nonzero(values<0));i=int(np.argmin(values));value=int(values[i]);record=(value,*cfg[i]);stream.update(("|".join(map(str,a))+":"+"|".join(map(str,record))+";").encode());candidate=(value,tuple(a),cfg[i])
        if minimum is None or candidate<minimum:
            minimum=candidate;q=cfg[i];witness={"value":value,"A_jet_i0_through_i7":list(a),"mB":q[0],"mC":q[1],"B2_endpoint":"EDGELESS" if q[2] else "PATH","C2_endpoint":"EDGELESS" if q[3] else "PATH"}
    assert minimum is not None and witness is not None
    return {"distinct_forest_polynomials":len(polynomials),"distinct_i0_through_i7_jets":len(jets),"oriented_feasible_order_pairs":len(cfg)//4,"rank2_corner_pairs":4,"lower_checks":checks,"negative":negative,"minimum":minimum[0],"minimum_witness":witness,"ordered_jet_minimum_stream_sha256":stream.hexdigest().upper(),"sign_audit":audit_signs(n)}

def main():
    assert sha(REDUCTION)==REDUCTION_SHA256 and sha(CORNER)==CORNER_SHA256
    reduction=json.loads(REDUCTION.read_text(encoding="utf-8"));corner=json.loads(CORNER.read_text(encoding="utf-8"));assert reduction["marker"]=="DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_SAFE_CAP_LOWER_RANK7_G5_FINISH" and reduction["ordinary_lower_sha256"]=="2338733A43D1947E8E9E3DE2B85D54235B7610E0E3028E5290D09B2506A81428";assert corner["corner_count"]==4
    forests,enumeration=enumerate_forest_polynomials(18);orders={};total=0;global_minimum=None;global_witness=None
    for n in range(14,19):
        result=audit_order(n,forests[n]);assert result["negative"]==0,(n,result["minimum_witness"]);orders[str(n)]=result;total+=result["lower_checks"];candidate=(result["minimum"],n)
        if global_minimum is None or candidate<global_minimum:global_minimum=candidate;global_witness={"N":n,**result["minimum_witness"]}
        print(f"AUDITED n={n} jets={result['distinct_i0_through_i7_jets']} checks={result['lower_checks']} negative=0 min={result['minimum']}",flush=True)
    report={"marker":MARKER,"status":"PASS exact finite adjacent ordinary parent0 safe-cap lower","theorem":"For every forest with adjacent marks u,v and ordinary p adjacent to neither mark, G2>=0 for 14<=N=|G-{u,v}|<=18.","enumeration":enumeration,"orders":orders,"aggregate":{"lower_checks":total,"negative":0,"global_minimum":global_minimum[0],"global_minimum_witness":global_witness},"exactness":{"safe_cap":"All PA/PB/PW harmful loss rows are induced subforests of A-p and are paid at the N-1 edgeless caps.","forest_jets":"Every distinct forest independence polynomial through order18 is enumerated and deduplicated through i0,...,i7.","row_reduction":"The pinned and strengthened N>=14 four-corner signs leave only b2,c2 endpoints."},"pins":{"reduction":{"file":REDUCTION.name,"sha256":REDUCTION_SHA256},"four_corner":{"file":CORNER.name,"sha256":CORNER_SHA256}},"scope_guard":"This covers p adjacent to neither mark and N=14..18 only; universal adjacent ordinary requires the separate literal and all-order certificates.","source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"lower_checks":total,"negative":0,"minimum":global_minimum[0]},indent=2,sort_keys=True));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
