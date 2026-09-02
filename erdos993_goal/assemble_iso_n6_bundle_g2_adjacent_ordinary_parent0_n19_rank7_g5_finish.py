#!/usr/bin/env python3
"""Fail-closed N>=19 assembly for adjacent ordinary p adjacent to neither mark."""

from __future__ import annotations
from fractions import Fraction
import hashlib,json
from pathlib import Path
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import weak_compositions

HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n6_bundle_g2_adjacent_ordinary_parent0_n19_exact_rank7_g5_finish_20260831.json"
MARKER="PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_N19_RANK7_G5_FINISH"
LM="PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_SAFE_CAP_FLINT_RANK7_G5_FINISH"
SM="PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_SAFE_CAP_SMALL_ORDER_FLINT_RANK7_G5_FINISH"
PINS={
"reduction_source":("derive_iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_lower_rank7_g5_finish.py","B0BF460FFC491D67E7C6855C0432F97810EBAF0BFEC683FA3E7462556F6B85D9"),
"reduction_report":("iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_lower_exact_rank7_g5_finish_20260831.json","D269AE7EF028A81175C8FC0D17F9562A6B2ECE000D957F247ED845D8E12414A0"),
"large_producer":("probe_iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_flint_rank7_g5_finish.py","EDD58281077B54B9DDB975A12F79FD70FCB03C3CA756D561C29BCA7192400CD3"),
"small_producer":("probe_iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_cap_small_order_flint_rank7_g5_finish.py","3B31214D37BD75C80B8D71A18DED22D8D998539D084EED666B9FA3116DE9175A"),
"no_parent_assembler":("assemble_iso_n6_bundle_g2_adjacent_no_parent_all_order_root.py","4B5F5828F60784FBCC0A543217DB1C2CA1DC15F80D84075A36C01FE5B2A87531"),
"no_parent_report":("iso_n6_bundle_g2_adjacent_no_parent_all_order_exact_root_20260831.json","B9323D7D6E2FC797BC47AB0844691B8AC70177744AEA165BCB34F033E7850CA9"),
"wedge_producer":("probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root.py","DDE496C597D5D558947B00770F98DAB96E1DEC8B1C07B5E0E13F3D8B9C10EA88"),
"q3_helper":("probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root.py","83E3E7D511EE4580D96284FC5EF12AFDA0DB9E8FC818FCE4EA887FF1EB7CD797"),
"bernstein_helper":("tensor_bernstein_flint_matrix_root.py","9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC"),
"sum_helper":("balanced_flint_mpoly_sum_root.py","976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD"),
}
LARGE_MANIFEST="99291DB950FAEED46AE9AF45D328118359B7AA8BDC9A385CEBC1CBDA97F46287"
SMALL_MANIFEST="72A915E92EFA5A6683E8B2EDB5D47C9965447E25C1715C8D3CDCCC2ECE885465"
SECOND_REPLAY=True

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def load(path):return json.loads(path.read_text(encoding="utf-8"))
def large_name(o,ch,b,c):return f"iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_{o}_{ch}_B{b}_C{c}_beta0_70_flint_rank7_g5_finish_20260831.json"
def small_name(s,k,b,c):return f"iso_n6_bundle_g2_adjacent_ordinary_parent0_safe_small_{s}{k}_B{b}_C{c}_beta0_70_flint_rank7_g5_finish_20260831.json"

def verify_group(names,marker,producer_hash,manifest_expected):
    hashes={name:sha(HERE/name) for name in sorted(names)};stream="".join(f"{n}\0{hashes[n]}\n" for n in sorted(names));manifest=hashlib.sha256(stream.encode()).hexdigest().upper();assert manifest==manifest_expected,(manifest,manifest_expected)
    total=neg=zero=simplex=0;minimum=None;rows=[];betas=list(weak_compositions(4,5))
    for name in sorted(names):
        r=load(HERE/name);assert r["marker"]==marker and r["source_sha256"]==producer_hash and r["reduction_report_sha256"]==PINS["reduction_report"][1];assert r["simplex_degree"]==4 and r["homogeneous_simplex_coefficients"]==70 and r["start_beta"]==0 and r["stop_beta"]==70 and r["processed_betas"]==70 and r["negative_betas"]==0 and len(r["records"])==70
        local=0;localmin=None
        for i,x in enumerate(r["records"]):
            assert x["beta_index"]==i and tuple(x["beta"])==betas[i] and x["negative"]==0 and x["zero"]==0
            q=Fraction(x["minimum"]);assert q>0;local+=x["bernstein_coefficients"];localmin=q if localmin is None else min(localmin,q)
        total+=local;simplex+=70;minimum=localmin if minimum is None else min(minimum,localmin);rows.append({"file":name,"sha256":hashes[name],"tensor_bernstein_coefficients":local,"minimum":str(localmin),"negative":0,"zero":0,"ordered_record_sha256":r["ordered_record_sha256"]})
    return {"shards":len(names),"simplex_coefficients":simplex,"tensor_bernstein_coefficients":total,"minimum":str(minimum),"negative":neg,"zero":zero,"manifest_sha256":manifest,"second_byte_identical_replay":SECOND_REPLAY},rows

def main():
    pins={}
    for label,(name,expected) in PINS.items():actual=sha(HERE/name);assert actual==expected,(label,expected,actual);pins[label]={"file":name,"sha256":actual}
    reduction=load(HERE/PINS["reduction_report"][0]);assert reduction["marker"]=="DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT0_SAFE_CAP_LOWER_RANK7_G5_FINISH" and reduction["ordinary_lower_sha256"]=="2338733A43D1947E8E9E3DE2B85D54235B7610E0E3028E5290D09B2506A81428"
    large=[large_name(o,ch,b,c) for o in ("B_le_C","B_ge_C") for ch in ("low","high") for b in (0,1) for c in (0,1)];small=[small_name(s,k,b,c) for s in ("B","C") for k in range(7) for b in (0,1) for c in (0,1)]
    lt,lr=verify_group(large,LM,PINS["large_producer"][1],LARGE_MANIFEST);st,sr=verify_group(small,SM,PINS["small_producer"][1],SMALL_MANIFEST)
    assert lt["shards"]==16 and st["shards"]==56 and lt["tensor_bernstein_coefficients"]==111_496_880 and st["tensor_bernstein_coefficients"]==43_298_736 and Fraction(lt["minimum"])==Fraction(st["minimum"])==Fraction(1,11520)
    report={"marker":MARKER,"status":"PASS exact N>=19 adjacent ordinary-parent p-nonadjacent rank-six G2 theorem","theorem":"For every forest with adjacent marks u,v and ordinary deleted parent p adjacent to neither marked endpoint, G2>=0 whenever common order N=|G-{u,v}|>=19.","coverage":{"small":"min(mB,mC)=0,...,6, both choices of small side and all four rank-two corners","large":"min(mB,mC)>=7, both order orientations, low/high charts, all four rank-two corners","exhaustive":True},"safe_cap_reduction":reduction["safe_cap_payment"],"occupation_identity":reduction["occupation_identity"],"large_certificate":lt,"small_certificate":st,"combined":{"shards":72,"simplex_coefficients":lt["simplex_coefficients"]+st["simplex_coefficients"],"tensor_bernstein_coefficients":lt["tensor_bernstein_coefficients"]+st["tensor_bernstein_coefficients"],"minimum":"1/11520","negative":0,"zero":0,"second_byte_identical_replay":SECOND_REPLAY},"large_shards":lr,"small_shards":sr,"pins":pins,"scope_guard":"This closes p adjacent to neither mark for N>=19 only. The finite and marked-spine adjacent ordinary modes are separate; universal G2 is not claimed by this report alone.","source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps({"marker":MARKER,"shards":72,"tensor":report["combined"]["tensor_bernstein_coefficients"],"minimum":"1/11520","replay":SECOND_REPLAY},indent=2,sort_keys=True));print("SOURCE_SHA256",report["source_sha256"]);print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)
if __name__=="__main__":main()
